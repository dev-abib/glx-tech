import { PrismaClient } from "@prisma/client";
import { createOTP } from "../../helpers/otp/otp.js";
import { hashPassword } from "../../utils/hash.js";
import { UserRepository } from "./user.repository.js";
import { CreateUserInput } from "./user.validation.js";

const userRepo = new UserRepository();
const prisma = new PrismaClient();

export class UserService {
  async createUser(data: CreateUserInput) {
    const isExists = await userRepo.findUser("email", data.email, false);

    const hashedPassword = await hashPassword(data.password);
    const { otp, hashedOtp, expiresAt } = createOTP();

    

    const user = await sendEmail({
      to: requireEmail(user.email, "createUser"),
      subject: "Verify Your Account",
      html: accountVerificationTemplate({
        name: safe(user.name),
        otp,
        email: requireEmail(user.email, "createUser template"),
      }),
    });

    const userObj = user.toObject();
    const { password, otp: otpHash, otpExpires, ...safeUser } = userObj;
    return safeUser;
  }
}
