import { PrismaClient, User, Role } from "@prisma/client";
import { ApiError } from "../../utils/api-error.js";
import {
  CreateUserInput,
  LoginUserInput,
  ResendOtpInput,
  ResetPasswordInput,
  VerifyUserAccountInput,
} from "./user.validation.js";
import { comparePassword, hashPassword } from "../../utils/hash.js";
import { AuthHelper } from "../../helpers/auth-helpers.js";
import { JwtPayload } from "jsonwebtoken";
import { sendEmail } from "../../emails/email.services.js";
import { accountVerificationTemplate } from "../../emails/templates/syestem/account.verification.template.js";
import { createOTP, verifyOTP } from "../../helpers/otp/otp.js";
import { ApiResponse } from "../../utils/api-response.js";
import { getPrismaClient } from "../../config/database.js";
import { accountVerificationConfirmationTemplate } from "../../emails/templates/syestem/account-verfication.confirmation.template.js";
import { resetPasswordTemplate } from "../../emails/templates/auth/reset-password.template.js";
import { resetPasswordConfirmationTemplate } from "../../emails/templates/auth/reset-password-confirmation.template.js";

const prisma = getPrismaClient();
const auth = new AuthHelper();

export class UserRepository {
  async findUser(
    type: "id" | "email",
    payload: string,
    isReturnUser: true
  ): Promise<User>;
  async findUser(
    type: "id" | "email",
    payload: string,
    isReturnUser?: false
  ): Promise<void>;

  async findUser(
    type: "id" | "email",
    payload: string,
    isReturnUser: boolean = false
  ): Promise<User | void> {
    const user = await prisma.user.findUnique({
      where: type === "id" ? { id: payload } : { email: payload },
    });

    if (isReturnUser) {
      if (!user) throw new ApiError(404, "User not found");
      return user;
    } else {
      if (user) throw new ApiError(409, "User already exists");
      return;
    }
  }

  // create user repo
  async createUser(data: CreateUserInput) {
    await this.findUser("email", data.email, false);

    const { otp, hashedOtp, expiresAt } = createOTP();
    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role as Role,
        phone: data.phone,
        otp: hashedOtp,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
      },
    });

    const payload: JwtPayload = {
      name: user.name as string,
      email: user.email as string,
      id: user.id,
      role: user.role as Role,
    };

    const accessToken = auth.generateToken(
      payload,
      user.role as Role,
      "access"
    );
    const refreshToken = auth.generateToken(
      payload,
      user.role as Role,
      "refresh"
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        accessToken: auth.hashToken(accessToken),
        refreshToken: auth.hashToken(refreshToken),
      },
    });

    const isMailSent = await sendEmail({
      to: user.email as string,
      subject: `Account verification otp ${process.env.MAIL_FROM_NAME as string}`,
      html: accountVerificationTemplate({
        name: user.name as string,
        otp: otp as string,
        email: user.email as string,
        expiresAt,
      }),
    });

    if (!isMailSent) {
      return new ApiResponse(201, "User created successfully.");
    }

    const {
      password,
      otp: otpHash,
      otpExpiresAt,
      otpAttempts,
      refreshToken: _,
      accessToken: __,
      resetToken,
      ...safeUser
    } = user;

    return safeUser;
  }

  // verify account repo
  async verifyAccount(data: VerifyUserAccountInput) {
    const user = await this.findUser("email", data.email, true);

    if (user.isEmailVerified)
      throw new ApiError(400, "Account already verified");

    if (user.otpExpiresAt && user.otpExpiresAt < new Date())
      throw new ApiError(400, "Otp expired");

    const isMatch = verifyOTP(
      data.otp as string,
      user.otp as string,
      user.otpExpiresAt as Date
    );
    if (!isMatch) {
      await prisma.user.update({
        where: { email: data.email },
        data: { otpAttempts: { increment: 1 }, otpExpiresAt: null, otp: null },
      });
      throw new ApiError(401, "Invalid otp");
    }

    await prisma.user.update({
      where: { email: data.email },
      data: {
        isEmailVerified: true,
        otp: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    await sendEmail({
      to: user.email as string,
      subject: `Account verification confirmation ${process.env.MAIL_FROM_NAME as string}`,
      html: accountVerificationConfirmationTemplate({
        name: user.name as string,
      }),
    });

    return {
      message: "Email verified successfully",
    };
  }

  // login user repo
  async loginAccount(data: LoginUserInput) {
    const user = await this.findUser("email", data.email, true);

    const isValidPass = await comparePassword(
      data.password as string,
      user.password as string
    );
    if (!isValidPass) throw new ApiError(401, "Invalid email or password");

    const isVerified = user.isEmailVerified;
    if (!isVerified)
      throw new ApiError(401, "Before login , please verify you account");

    const payload = {
      name: user.name as string,
      email: user.email as string,
      id: user.id,
      isPaid: user.isPaid as boolean,
      role: user.role,
    };

    const accessToken = auth.generateToken(
      payload,
      user.role as Role,
      "access"
    );
    const refreshToken = auth.generateToken(
      payload,
      user.role as Role,
      "refresh"
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: auth.hashToken(refreshToken),
        accessToken: auth.hashToken(accessToken),
      },
    });

    const return_user = {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    return {
      message: "Logged in successfully",
      data: {
        token: {
          accessToken,
          refreshToken,
        },
        user: return_user,
      },
    };
  }

  // resend otp repo
  async resendOtp(data: VerifyUserAccountInput): Promise<{ message: string }> {
    const user = await this.findUser("email", data.email, true);

    const { otp, hashedOtp, expiresAt } = createOTP();

    if (user.isEmailVerified && !user.isResetRequest)
      throw new ApiError(400, "Account already verified");

    if ((user.otpAttempts ?? 0) >= 3) {
      await prisma.user.delete({ where: { email: data.email } });
      throw new ApiError(
        400,
        "Max OTP attempts exceeded, please register again"
      );
    }

    await prisma.user.update({
      where: { email: data.email },
      data: {
        otp: hashedOtp,
        otpExpiresAt: expiresAt,
        otpAttempts: { increment: 1 },
      },
    });

    const isMailSent = await sendEmail({
      to: user.email as string,
      subject: `OTP Resend ${process.env.MAIL_FROM_NAME as string}`,
      html: accountVerificationTemplate({
        name: user.name as string,
        email: user.email as string,
        otp,
        expiresAt,
      }),
    });

    if (!isMailSent) {
      throw new ApiError(
        500,
        "Something went wrong, can't send resend otp at the moment"
      );
    }

    return {
      message: "Email otp sent successfully, please check your mailbox",
    };
  }

  // forgot password service
  async forgotPassword(data: ResendOtpInput): Promise<string> {
    const user = await this.findUser("email", data.email, true);

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.blockedUntil.getTime() - Date.now()) / 60000
      );
      throw new ApiError(
        429,
        `Account is blocked. Try again in ${minutesLeft} minutes.`
      );
    }

    if (!user.isEmailVerified) {
      throw new ApiError(
        401,
        "To reset your password, you must verify your account first"
      );
    }

    if ((user.otpAttempts ?? 0) >= 3) {
      const blockedUntil = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { email: data.email },
        data: {
          blockedUntil,
          otpAttempts: 0,
        },
      });

      throw new ApiError(
        429,
        "Too many attempts. Your account is blocked for 15 minutes."
      );
    }

    const { otp, hashedOtp, expiresAt } = createOTP();

    await prisma.user.update({
      where: { email: data.email },
      data: {
        otp: hashedOtp,
        otpAttempts: { increment: 1 },
        otpExpiresAt: expiresAt,
        blockedUntil: null,
        isResetRequest: true,
      },
    });

    const isMailSent = await sendEmail({
      to: user.email as string,
      subject: `Forgot password otp ${process.env.MAIL_FROM_NAME as string}`,
      html: resetPasswordTemplate({
        name: user.name as string,
        email: user.email as string,
        otp,
        expiresAt: user.otpExpiresAt as Date,
      }),
    });

    if (!isMailSent) {
      throw new ApiError(
        500,
        "Something went wrong, can't send otp at the moment"
      );
    }

    return "Forgot password otp sent successfully, please check your mailbox";
  }

  // verify otp service
  async verifyOtp(dto: VerifyUserAccountInput) {
    const user = await this.findUser("email", dto.email, true);

    if (user.otpExpiresAt && user.otpExpiresAt < new Date())
      throw new ApiError(400, "Otp expired");

    const isMatch = verifyOTP(
      dto.otp,
      user.otp as string,
      user.otpExpiresAt as Date
    );
    if (!isMatch) {
      await prisma.user.update({
        where: { email: dto.email },
        data: { otpAttempts: { increment: 1 }, otpExpiresAt: null, otp: null },
      });
      throw new ApiError(401, "Invalid otp");
    }

    const token = auth.generateToken(
      {
        name: user.name as string,
        email: user.email as string,
        id: user.id,
        isPaid: user.isPaid as boolean,
        role: user.role,
      },
      "reset",
      "refresh"
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        otp: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    return {
      message: "otp verified successfully",
      data: {
        token,
      },
    };
  }

  // reset password service
  async resetPassword(data: ResetPasswordInput, user: JwtPayload) {
    await this.findUser("id", user.id, true);

    const hashedPassword = await auth.hashPassword(data.password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isResetRequest: false,
        resetToken: null,
        otpAttempts: 0,
      },
    });

    const isMailSent = await sendEmail({
      to: user.email,
      subject: `Password reset confirmation  ${process.env.MAIL_FROM_NAME as string}`,
      html: resetPasswordConfirmationTemplate({
        name: user.name,
      }),
    });

    if (!isMailSent) {
      throw new ApiError(
        500,
        "Something went wrong, can't sent otp at the moment"
      );
    }

    return {
      message: "Password reset successful.",
      data: null,
    };
  }
}
