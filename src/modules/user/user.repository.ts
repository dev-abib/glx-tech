import { User, Role } from "@prisma/client";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/api-error.js";
import {
  ChangePasswordInput,
  CreateUserInput,
  LoginUserInput,
  ResendOtpInput,
  ResetPasswordInput,
  UpdateUserAsSellerInput,
  UpdateUserInput,
  VerifyUserAccountInput,
} from "./user.validation.js";
import { comparePassword, hashPassword } from "../../utils/hash.js";
import { AuthHelper } from "../../helpers/auth-helpers.js";
import { CloudinaryService } from "../../helpers/cloudinary.service.js";
import { JwtPayload } from "jsonwebtoken";
import { sendEmail } from "../../emails/email.services.js";
import { accountVerificationTemplate } from "../../emails/templates/syestem/account.verification.template.js";
import { createOTP, verifyOTP } from "../../helpers/otp/otp.js";
import { getPrismaClient } from "../../config/database.js";
import { accountVerificationConfirmationTemplate } from "../../emails/templates/syestem/account-verfication.confirmation.template.js";
import { resetPasswordTemplate } from "../../emails/templates/auth/reset-password.template.js";
import { resetPasswordConfirmationTemplate } from "../../emails/templates/auth/reset-password-confirmation.template.js";
import { changePasswordConfirmationTemplate } from "../../emails/templates/auth/change-password.template.js";
import { deleteAccountConfirmationTemplate } from "../../emails/templates/auth/delete-account-confirmation.template.js";

const prisma = getPrismaClient();
const auth = new AuthHelper();
const cloudinary = new CloudinaryService();

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
      subject: `Account verification otp ${env.MAIL_FROM_NAME}`,
      html: accountVerificationTemplate({
        name: user.name as string,
        otp: otp as string,
        email: user.email as string,
        expiresAt,
      }),
    });

    if (!isMailSent) {
      throw new ApiError(
        500,
        "Something went wrong, can't send verification email at the moment"
      );
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
      subject: `Account verification confirmation ${env.MAIL_FROM_NAME}`,
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
  async resendOtp(data: ResendOtpInput): Promise<{ message: string }> {
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
      subject: `OTP Resend ${env.MAIL_FROM_NAME}`,
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

  // forgot password repo
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
      subject: `Forgot password otp ${env.MAIL_FROM_NAME}`,
      html: resetPasswordTemplate({
        name: user.name as string,
        email: user.email as string,
        otp,
        expiresAt,
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

  // verify otp repo
  async verifyResetOtp(dto: VerifyUserAccountInput) {
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

  // reset password repo
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
      subject: `Password reset confirmation  ${env.MAIL_FROM_NAME}`,
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

  // change password repo
  async changePassword(data: ChangePasswordInput, user: JwtPayload) {
    const existingUser = await this.findUser("id", user.id, true);

    if (!existingUser.password) {
      throw new ApiError(400, "No password set for this account");
    }

    const isValidPass = await comparePassword(
      data.oldPassword as string,
      existingUser.password as string
    );

    if (!isValidPass) {
      throw new ApiError(401, "Old password is incorrect");
    }

    const hashPassword = await auth.hashPassword(data.password);

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashPassword,
      },
    });

    const isMailSent = await sendEmail({
      to: user.email,
      subject: `Password change confirmation  ${env.MAIL_FROM_NAME}`,
      html: changePasswordConfirmationTemplate({
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
      message: "Password changed successfully.",
      data: null,
    };
  }

  // ── Profile & User management ───────────────────────────────────────

  // get current user by id (get-me)
  async getMe(userId: string) {
    const user = await this.findUser("id", userId, true);

    const {
      password,
      otp: _otp,
      otpExpiresAt,
      otpAttempts,
      refreshToken: _rt,
      accessToken: _at,
      resetToken,
      ...safeUser
    } = user;

    return safeUser;
  }

  // get all users (admin only)
  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          phone: true,
          isEmailVerified: true,
          isActive: true,
          isPaid: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // update user (name, phone, address) with optional avatar upload
  async updateUser(
    userId: string,
    data: UpdateUserInput,
    avatarBuffer?: Buffer
  ) {
    const user = await this.findUser("id", userId, true);

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;

    // Handle email change — check uniqueness first
    if (data.email !== undefined) {
      // If the email is different from the current one, ensure it's not taken
      if (data.email !== user.email) {
        await this.findUser("email", data.email, false);
      }
      updateData.email = data.email;
    }

    // Handle avatar upload — upload new first, then delete old on success
    if (avatarBuffer) {
      const result = await cloudinary.uploadFile(avatarBuffer, "avatars");

      // Upload succeeded — now safe to delete the old one
      if (user.avatarPublicId) {
        await cloudinary.deleteFile(user.avatarPublicId).catch(() => {
          // Ignore errors — old file may have been deleted already
        });
      }

      updateData.avatar = result.url;
      updateData.avatarPublicId = result.publicId;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const {
      password,
      otp: _otp,
      otpExpiresAt,
      otpAttempts,
      refreshToken: _rt,
      accessToken: _at,
      resetToken,
      ...safeUser
    } = updated;

    return safeUser;
  }

  // update user as seller repo
  async updateUserAsSeller(
    userId: string,
    data: UpdateUserAsSellerInput
  ): Promise<{ message: string }> {
    const user = await this.findUser("id", userId, true);

    if (user.isSeller) {
      throw new ApiError(400, "User already marked as a seller");
    }

    if (
      !Array.isArray(data.servicesId) ||
      !data.servicesId.every((service) => typeof service === "string")
    ) {
      throw new ApiError(400, "servicesId must be an array of strings");
    }

    await prisma.$transaction([
      prisma.sellerInfo.create({
        data: {
          userId: userId,
          storeName: data.storeName,
          servicesId: data.servicesId as string[],
          insuranceStatus: data.insuranceStatus,
          socialLInk: data.socialLInk,
          businessNumber: data.businessNumber,
          businessEmail: data.businessEmail,
          streetAddress: data.streetAddress,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { isSeller: true },
      }),
    ]);

    return { message: "User updated as seller successfully" };
  }

  // delete user (hard delete)
  async deleteUser(userId: string) {
    const user = await this.findUser("id", userId, true);

    // Send confirmation email BEFORE deleting the user
    await sendEmail({
      to: user.email as string,
      subject: `Account deleted — ${env.MAIL_FROM_NAME}`,
      html: deleteAccountConfirmationTemplate({
        name: user.name as string,
      }),
    });

    // Delete DB record, then clean up Cloudinary
    await prisma.user.delete({ where: { id: userId } });

    if (user.avatarPublicId) {
      await cloudinary.deleteFile(user.avatarPublicId).catch(() => {
        // Ignore errors — file cleanup is best-effort after DB delete
      });
    }

    return { message: "User deleted successfully" };
  }

  // logout user — clear refresh token
  async logoutUser(userId: string) {
    await this.findUser("id", userId, true);

    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        accessToken: null,
      },
    });

    return { message: "Logged out successfully" };
  }

  // switch role between user and seller
  async switchRole(userId: string) {
    const user = await this.findUser("id", userId, true);

    if (user.role !== "user" && user.role !== "seller") {
      throw new ApiError(
        400,
        "Only users can switch between user and seller roles"
      );
    }

    if (user.role === "user" && !user.isSeller) {
      throw new ApiError(
        401,
        "To switch role as seller, you must have setup your business."
      );
    }

    const newRole = user.role === "user" ? "seller" : "user";

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    const payload: JwtPayload = {
      name: updated.name as string,
      email: updated.email as string,
      id: updated.id,
      isPaid: updated.isPaid as boolean,
      role: updated.role,
    };

    const accessToken = auth.generateToken(
      payload,
      updated.role as Role,
      "access"
    );
    const refreshToken = auth.generateToken(
      payload,
      updated.role as Role,
      "refresh"
    );

    await prisma.user.update({
      where: { id: updated.id },
      data: {
        accessToken: auth.hashToken(accessToken),
        refreshToken: auth.hashToken(refreshToken),
      },
    });

    return {
      message: `Role switched to ${newRole} successfully`,
      data: {
        token: {
          accessToken,
          refreshToken,
        },
        role: newRole,
      },
    };
  }

  // refresh token service
  async refreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = auth.verifyToken(refreshToken, "user", "refresh");
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await this.findUser("id", payload.id, true);

    const hashedIncoming = auth.hashToken(refreshToken);
    if (!user.refreshToken || user.refreshToken !== hashedIncoming) {
      throw new ApiError(401, "Refresh token revoked or mismatched");
    }

    const newPayload: JwtPayload = {
      id: user.id,
      email: user.email as string,
      name: user.name as string,
      role: user.role,
      isPaid: user.isPaid as boolean,
    };

    const newAccessToken = auth.generateToken(
      newPayload,
      user.role as Role,
      "access"
    );
    const newRefreshToken = auth.generateToken(
      newPayload,
      user.role as Role,
      "refresh"
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: auth.hashToken(newRefreshToken) },
    });

    return {
      message: "Token refreshed successfully",
      data: {
        token: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      },
    };
  }
}
