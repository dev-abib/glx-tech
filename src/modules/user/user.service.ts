import { UserRepository } from "./user.repository.js";
import {
  CreateUserInput,
  ResendOtpInput,
  VerifyUserAccountInput,
} from "./user.validation.js";

const userRepo = new UserRepository();

export class UserService {
  // create user service
  async createUser(data: CreateUserInput) {
    const user = await userRepo.createUser(data);
    return user;
  }

  // verify user service
  async verifyUser(data: VerifyUserAccountInput) {
    const user = await userRepo.verifyAccount(data);
    return user;
  }

  // resend user service
  async resendOtp(data: ResendOtpInput): Promise<{ message: string }> {
    const msg = await userRepo.resendOtp(data);
    return msg;
  }
}
