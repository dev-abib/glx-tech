import { PrismaClient, User, Role } from "@prisma/client";
import { ApiError } from "../../utils/api-error.js";
import { CreateUserInput } from "./user.validation.js";
import { hashPassword } from "../../utils/hash.js";
import { AuthHelper } from "../../helpers/auth-helpers.js";
import { JwtPayload } from "jsonwebtoken";
import { sendEmail } from "../../emails/email.services.js";
import { accountVerificationTemplate } from "../../emails/templates/syestem/account.verification.template.js";
import { createOTP } from "../../helpers/otp/otp.js";
import { ApiResponse } from "../../utils/api-response.js";
import { getPrismaClient } from "../../config/database.js";

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

  async createUser(data: CreateUserInput) {
    this.findUser("email", data.email, false);

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
      }),
    });

    if (!isMailSent) {
      return new ApiResponse(201, "User created successfully.");
    }

    console.log(user, "from repo");

    const { password, otp: otpHash, otpExpiresAt, ...safeUser } = user;
    console.log(safeUser, "safeUser");
    return safeUser;
  }
}
