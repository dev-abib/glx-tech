import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";
import { AdminService } from "./admin.service.js";
import type {
  AdminLoginInput,
  CreateAdminInput,
  AdminChangePasswordInput,
  AdminUpdateUserInput,
} from "./admin.validation.js";

const adminService = new AdminService();

// ── Admin Login ───────────────────────────────────────────────────────────

export const adminLogin: RequestHandler<
  {},
  ApiResponse<{ accessToken: string; refreshToken: string; admin: { id: string; name: string | null; email: string | null; role: string; avatar: string | null } }>,
  AdminLoginInput
> = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.login(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result.message, result.data));
});

// ── Create Admin ──────────────────────────────────────────────────────────

export const createAdmin: RequestHandler<
  {},
  ApiResponse<{
    id: string;
    name: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
  }>,
  CreateAdminInput
> = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminService.createAdmin(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Admin created successfully", admin));
});

// ── Get Current Admin Profile ────────────────────────────────────────────

export const getAdminMe: RequestHandler<
  {},
  ApiResponse<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar: string | null;
    phone: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    isPaid: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminService.getMe(req.user!.id);

  return res
    .status(200)
    .json(new ApiResponse(200, "Admin profile fetched successfully", admin));
});

// ── Get All Admins ────────────────────────────────────────────────────────

export const getAllAdmins: RequestHandler<
  {},
  ApiResponse<{
    admins: Array<{
      id: string;
      name: string | null;
      email: string | null;
      role: string;
      avatar: string | null;
      phone: string | null;
      isEmailVerified: boolean;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const result = await adminService.getAllAdmins(page, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, "Admins fetched successfully", result));
});

// ── Change Admin Password ─────────────────────────────────────────────────

export const adminChangePassword: RequestHandler<
  {},
  ApiResponse<null>,
  AdminChangePasswordInput
> = asyncHandler(async (req: Request, res: Response) => {
  const msg = await adminService.changePassword(req.body, req.user!);

  return res
    .status(200)
    .json(new ApiResponse(200, msg));
});

// ── Admin deletes a user by ID ────────────────────────────────────────────

export const adminDeleteUser: RequestHandler<
  { id: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await adminService.deleteUser(id, req.user!.role);

  return res
    .status(200)
    .json(new ApiResponse(200, result.message));
});

// ── Super admin gets all users ────────────────────────────────────────────

export const adminGetAllUsers: RequestHandler<
  {},
  ApiResponse<{
    users: Array<{
      id: string;
      name: string | null;
      email: string | null;
      role: string;
      avatar: string | null;
      phone: string | null;
      isEmailVerified: boolean;
      isActive: boolean;
      isPaid: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const result = await adminService.getAllUsers(page, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, "Users fetched successfully", result));
});

// ── Admin updates own profile ─────────────────────────────────────────────

export const adminUpdateSelf: RequestHandler<
  {},
  ApiResponse<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar: string | null;
    phone: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  const avatarBuffer = file ? file.buffer : undefined;

  const admin = await adminService.updateSelf(req.user!.id, req.body, avatarBuffer);

  return res
    .status(200)
    .json(new ApiResponse(200, "Profile updated successfully", admin));
});

// ── Super admin deletes an admin by ID ────────────────────────────────────

export const adminDeleteAdmin: RequestHandler<
  { id: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await adminService.deleteAdmin(id, req.user!.id);

  return res
    .status(200)
    .json(new ApiResponse(200, result.message));
});

// ── Admin Refresh Token ──────────────────────────────────────────────────

export const adminRefreshToken: RequestHandler<
  {},
  ApiResponse<{ accessToken: string; refreshToken: string }>,
  { refreshToken: string }
> = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const result = await adminService.refreshToken(refreshToken);

  return res
    .status(200)
    .json(new ApiResponse(200, result.message, result.data));
});

// ── Get a single user/admin by ID ────────────────────────────────────────

export const adminGetUserById: RequestHandler<
  { id: string },
  ApiResponse<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar: string | null;
    phone: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    isPaid: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = await adminService.getUserById(id);

  return res
    .status(200)
    .json(new ApiResponse(200, "User fetched successfully", user));
});

// ── Super admin updates an admin by ID ────────────────────────────────────

export const adminUpdateAdmin: RequestHandler<
  { id: string },
  ApiResponse<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar: string | null;
    phone: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>,
  AdminUpdateUserInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const admin = await adminService.updateAdmin(id, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, "Admin updated successfully", admin));
});
