import { Request, RequestHandler, Response } from "express";
import { UserService } from "./user.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";

type MulterFile = { buffer: Buffer };
import {
  CreateUserInput,
  ForgotPasswordInput,
  RefreshTokenInput,
  ResendOtpInput,
  ResetPasswordInput,
  SwitchRoleInput,
  UpdateUserAsSellerInput,
  UpdateUserInput,
  VerifyUserAccountInput,
} from "./user.validation.js";
import type {
  SafeUser,
  LoginResponseData,
  RefreshTokenResponseData,
} from "./user.interface.js";

const userService = new UserService();

// create user controller
export const createUser: RequestHandler<
  {},
  ApiResponse<SafeUser>,
  CreateUserInput
> = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);

  return res
    .status(201)
    .json(new ApiResponse<SafeUser>(201, "User created successfully", user));
});

// verify user account controller
export const verifyUserAccount: RequestHandler<
  {},
  ApiResponse<null>,
  VerifyUserAccountInput
> = asyncHandler(async (req: Request, res: Response) => {
  await userService.verifyUser(req.body);

  return res
    .status(201)
    .json(new ApiResponse<null>(201, "User verified successfully"));
});

// login user account controller
export const loginUserAccount: RequestHandler<
  {},
  ApiResponse<LoginResponseData>,
  VerifyUserAccountInput
> = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.loginUserAccount(req.body);

  return res
    .status(201)
    .json(new ApiResponse<LoginResponseData>(201, result.message, result.data));
});

// resend otp controller
export const resendOtp: RequestHandler<
  {},
  ApiResponse<null>,
  ResendOtpInput
> = asyncHandler(async (req: Request, res: Response) => {
  const msg = await userService.resendOtp(req.body);

  return res.status(201).json(new ApiResponse<null>(201, msg.message));
});

// forgot password controller
export const forgotPassword: RequestHandler<
  {},
  ApiResponse<null>,
  ForgotPasswordInput
> = asyncHandler(async (req: Request, res: Response) => {
  const msg = await userService.forgotPassword(req.body);

  return res.status(201).json(new ApiResponse<null>(201, msg));
});

// verify reset otp controller
export const verifyResetOtp: RequestHandler<
  {},
  ApiResponse<{ token: string }>,
  VerifyUserAccountInput
> = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.verifyResetOtp(req.body);

  return res
    .status(201)
    .json(new ApiResponse<{ token: string }>(201, result.message, result.data));
});

// reset password controller
export const resetPassword: RequestHandler<
  {},
  ApiResponse<null>,
  ResetPasswordInput
> = asyncHandler(async (req: Request, res: Response) => {
  const msg = await userService.resetPassword(req.body, req.user!);

  return res.status(201).json(new ApiResponse<null>(201, msg));
});

// change password controller
export const changePassword: RequestHandler<
  {},
  ApiResponse<null>,
  ResetPasswordInput
> = asyncHandler(async (req: Request, res: Response) => {
  const msg = await userService.changePassword(req.body, req.user!);

  return res.status(201).json(new ApiResponse<null>(201, msg));
});

// ── Profile & User management ───────────────────────────────────────────

// get current user profile
export const getMe: RequestHandler<{}, ApiResponse<SafeUser>> = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.getMe(req.user!.id);

    return res
      .status(200)
      .json(
        new ApiResponse<SafeUser>(200, "Profile fetched successfully", user)
      );
  }
);

// get all users (admin)
export const getAllUsers: RequestHandler<
  {},
  ApiResponse<{
    users: Pick<
      SafeUser,
      | "id"
      | "name"
      | "email"
      | "role"
      | "avatar"
      | "phone"
      | "isEmailVerified"
      | "isActive"
      | "isPaid"
      | "createdAt"
      | "updatedAt"
    >[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit as string) || 10)
  );
  const result = await userService.getAllUsers(page, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, "Users fetched successfully", result));
});

// update user (with optional avatar upload)
export const updateUser: RequestHandler<
  {},
  ApiResponse<SafeUser>,
  UpdateUserInput
> = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const file = (req as Request & { file?: MulterFile }).file;
  const avatarBuffer = file ? file.buffer : undefined;

  const user = await userService.updateUser(userId, req.body, avatarBuffer);

  return res
    .status(200)
    .json(new ApiResponse<SafeUser>(200, "Profile updated successfully", user));
});

// update user to seller
export const updateAsSeller: RequestHandler<
  {},
  ApiResponse<{ message: string }>,
  UpdateUserAsSellerInput
> = asyncHandler(async(req: Request, res: Response) => {
  const userId = req.user!.id;
  await userService.updateUserAsSeller(userId,req.body);
});

// delete user
export const deleteUser: RequestHandler<{}, ApiResponse<null>> = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await userService.deleteUser(userId);

    return res
      .status(200)
      .json(new ApiResponse<null>(200, "User deleted successfully"));
  }
);

// logout user
export const logout: RequestHandler<{}, ApiResponse<null>> = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await userService.logoutUser(userId);

    return res
      .status(200)
      .json(new ApiResponse<null>(200, "Logged out successfully"));
  }
);

// switch role controller
export const switchRole: RequestHandler<
  {},
  ApiResponse<{
    accessToken: string;
    refreshToken: string;
    role: string;
  }>,
  SwitchRoleInput
> = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await userService.switchRole(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, result.message, result.data));
});

// refresh token controller
export const refreshToken: RequestHandler<
  {},
  ApiResponse<RefreshTokenResponseData>,
  RefreshTokenInput
> = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body.refreshToken;
  const result = await userService.refreshToken(token);

  return res
    .status(201)
    .json(
      new ApiResponse<RefreshTokenResponseData>(
        201,
        result.message,
        result.data
      )
    );
});
