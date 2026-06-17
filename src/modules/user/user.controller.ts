import { Request, RequestHandler, Response } from "express";
import { UserService } from "./user.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";
import { CreateUserInput } from "./user.validation.js";



export const createUser: RequestHandler<
  {},
  ApiResponse<{ message: string }>,
  CreateUserInput
> = asyncHandler(async (req: Request, res: Response) => {
  const { name, email } = req.body;

  const user = UserService.createUser(name, email);

  return res
    .status(201)
    .json(new ApiResponse(201, "User created successfully", user));
});
