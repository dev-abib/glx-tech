import { JwtPayload } from "jsonwebtoken";
import { UserRepository } from "./user.repository.js";
import {
  ChangePasswordInput,
  CreateUserInput,
  ForgotPasswordInput,
  LoginUserInput,
  RefreshTokenInput,
  ResendOtpInput,
  ResetPasswordInput,
  UpdateUserAsSellerInput,
  UpdateUserInput,
  VerifyUserAccountInput,
} from "./user.validation.js";
import type { LoginResponseData, SafeUser } from "./user.interface.js";

const userRepo = new UserRepository();

export class UserService {
  // create user service
  async createUser(data: CreateUserInput): Promise<SafeUser> {
    const user = await userRepo.createUser(data);
    return user;
  }

  // verify user service
  async verifyUser(data: VerifyUserAccountInput) {
    const user = await userRepo.verifyAccount(data);
    return user;
  }

  // login user service
  async loginUserAccount(payload: LoginUserInput): Promise<{
    message: string;
    data: LoginResponseData;
  }> {
    const result = await userRepo.loginAccount(payload);
    return {
      message: result.message,
      data: result.data as LoginResponseData,
    };
  }

  // resend user service
  async resendOtp(data: ResendOtpInput): Promise<{ message: string }> {
    const msg = await userRepo.resendOtp(data);
    return msg;
  }

  // forgot password service
  async forgotPassword(data: ForgotPasswordInput): Promise<string> {
    const msg = await userRepo.forgotPassword(data);
    return msg;
  }

  // verify otp service
  async verifyResetOtp(
    data: VerifyUserAccountInput
  ): Promise<{ message: string; data: { token: string } }> {
    const result = await userRepo.verifyResetOtp(data);
    return {
      message: result.message,
      data: {
        token: result.data.token,
      },
    };
  }

  // reset password service
  async resetPassword(
    data: ResetPasswordInput,
    user: JwtPayload
  ): Promise<string> {
    const msg = await userRepo.resetPassword(data, user);
    return msg.message;
  }

  // change password service
  async changePassword(
    data: ChangePasswordInput,
    user: JwtPayload
  ): Promise<string> {
    const msg = await userRepo.changePassword(data, user);
    return msg.message;
  }

  // ── Profile & User management ─────────────────────────────────────────

  // get current user profile
  async getMe(userId: string): Promise<SafeUser> {
    return userRepo.getMe(userId);
  }

  // get all users (admin)
  async getAllUsers(page: number, limit: number) {
    return userRepo.getAllUsers(page, limit);
  }

  // update user with optional avatar
  async updateUser(
    userId: string,
    data: UpdateUserInput,
    avatarBuffer?: Buffer
  ): Promise<SafeUser> {
    return userRepo.updateUser(userId, data, avatarBuffer);
  }

  // update user as seller
  async updateUserAsSeller(
    userId: string,
    data: UpdateUserAsSellerInput
  ): Promise<{ message: string }> {
    return userRepo.updateUserAsSeller(userId, data);
  }

  // delete user
  async deleteUser(userId: string): Promise<{ message: string }> {
    return userRepo.deleteUser(userId);
  }

  // logout user
  async logoutUser(userId: string): Promise<{ message: string }> {
    return userRepo.logoutUser(userId);
  }

  // switch role between user and seller
  async switchRole(userId: string): Promise<{
    message: string;
    data: { accessToken: string; refreshToken: string; role: string };
  }> {
    const result = await userRepo.switchRole(userId);
    return {
      message: result.message,
      data: {
        accessToken: result.data.token.accessToken,
        refreshToken: result.data.token.refreshToken,
        role: result.data.role,
      },
    };
  }

  // refresh token service
  async refreshToken(refreshToken: RefreshTokenInput["refreshToken"]): Promise<{
    message: string;
    data: { accessToken: string; refreshToken: string };
  }> {
    const result = await userRepo.refreshToken(refreshToken);
    return {
      message: result.message,
      data: {
        accessToken: result.data.token.accessToken,
        refreshToken: result.data.token.refreshToken,
      },
    };
  }
}
