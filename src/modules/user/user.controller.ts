import { Request, RequestHandler, Response } from "express";
import { UserService } from "./user.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";
import {
  CreateUserInput,
  ResendOtpInput,
  VerifyUserAccountInput,
} from "./user.validation.js";

const userService = new UserService();

// create user controller
export const createUser: RequestHandler<
  {},
  ApiResponse<any>,
  CreateUserInput
> = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "User created successfully", user));
});

// verify user account controller
export const verifyUserAccount: RequestHandler<
  {},
  ApiResponse<any>,
  VerifyUserAccountInput
> = asyncHandler(async (req: Request, res: Response) => {
  await userService.verifyUser(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "User verified successfully"));
});

// login user account controller
export const loginUserAccount: RequestHandler<
  {},
  ApiResponse<any>,
  VerifyUserAccountInput
> = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.loginUserAccount(req.body);

  return res.status(201).json(new ApiResponse(201, result.message, result.data));
});

// resend otp controller
export const resendOtp: RequestHandler<
  {},
  ApiResponse<any>,
  ResendOtpInput
> = asyncHandler(async (req: Request, res: Response) => {
  const msg = await userService.resendOtp(req.body);

  return res.status(201).json(new ApiResponse(201, msg.message));
});

// forgot password controller
export const forgotPassword: RequestHandler<
  {},
  ApiResponse<any>,
  ResendOtpInput
> = asyncHandler(async (req: Request, res: Response) => {
  const msg = await userService.forgotPassword(req.body);

  return res.status(201).json(new ApiResponse(201, msg));
});
