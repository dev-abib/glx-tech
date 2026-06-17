import { UserRepository } from "./user.repository.js";
import {
  CreateUserInput,
  LoginUserInput,
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

  // login user service
  async loginUserAccount<T = any>(
    payload: LoginUserInput
  ): Promise<{
    message: string;
    data: T;
  }> {
    const result = await userRepo.loginAccount(payload);
    return {
      message: result.message,
      data: result.data as T,
    };
  }

  // resend user service
  async resendOtp(data: ResendOtpInput): Promise<{ message: string }> {
    const msg = await userRepo.resendOtp(data);
    return msg;
  }

  // forgot password service
  async forgotPassword(data: ResendOtpInput): Promise<string> {
    const msg = await userRepo.resendOtp(data);
    return msg.message;
  }
}
