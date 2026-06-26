import { Role } from "@prisma/client";
import { UserRepository } from "../user/user.repository.js";
import { AuthHelper } from "../../helpers/auth-helpers.js";
import { comparePassword, hashPassword } from "../../utils/hash.js";
import { ApiError } from "../../utils/api-error.js";
import { getPrismaClient } from "../../config/database.js";
import { sendEmail } from "../../emails/email.services.js";
import { env } from "../../config/env.js";
import { CloudinaryService } from "../../helpers/cloudinary.service.js";
import { deleteAccountConfirmationTemplate } from "../../emails/templates/auth/delete-account-confirmation.template.js";
import type {
  AdminLoginInput,
  CreateAdminInput,
  AdminChangePasswordInput,
  AdminUpdateSelfInput,
  AdminUpdateUserInput,
} from "./admin.validation.js";
import type { JwtPayload } from "jsonwebtoken";

const prisma = getPrismaClient();
const userRepo = new UserRepository();
const auth = new AuthHelper();
const cloudinary = new CloudinaryService();

export class AdminService {
  // ── Admin Login ─────────────────────────────────────────────────────────

  async login(data: AdminLoginInput) {
    const user = await userRepo.findUser("email", data.email, true);

    // Verify password
    const isValidPass = await comparePassword(
      data.password,
      user.password as string
    );
    if (!isValidPass) throw new ApiError(401, "Invalid email or password");

    // Ensure the user is an admin or super_admin
    if (user.role !== "admin" && user.role !== "super_admin") {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }

    if (!user.isEmailVerified) {
      throw new ApiError(
        401,
        "Account not verified. Please verify your account first."
      );
    }

    if (!user.isActive) {
      throw new ApiError(403, "Account is deactivated. Contact support.");
    }

    const payload: JwtPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPaid: user.isPaid,
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

    // Store hashed tokens in DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accessToken: auth.hashToken(accessToken),
        refreshToken: auth.hashToken(refreshToken),
        lastLoginAt: new Date(),
      },
    });

    return {
      message: "Admin logged in successfully",
      data: {
        accessToken,
        refreshToken,
        admin: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      },
    };
  }

  // ── Create Admin (Super Admin only) ─────────────────────────────────────

  async createAdmin(data: CreateAdminInput) {
    // Check if email already exists
    await userRepo.findUser("email", data.email, false);

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role as Role,
        phone: data.phone ?? null,
        isEmailVerified: true, // Admins are auto-verified
        isActive: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  // ── Get Current Admin Profile ───────────────────────────────────────────

  async getMe(adminId: string) {
    const user = await userRepo.findUser("id", adminId, true);

    if (user.role !== "admin" && user.role !== "super_admin") {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      isPaid: user.isPaid,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ── Get All Admins (Super Admin only) ───────────────────────────────────

  async getAllAdmins(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [admins, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: { in: ["admin", "super_admin"] },
        },
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
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({
        where: {
          role: { in: ["admin", "super_admin"] },
        },
      }),
    ]);

    return {
      admins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Change Admin Password ───────────────────────────────────────────────

  async changePassword(data: AdminChangePasswordInput, jwtPayload: JwtPayload) {
    const user = await userRepo.findUser("id", jwtPayload.id, true);

    if (user.role !== "admin" && user.role !== "super_admin") {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }

    if (!user.password) {
      throw new ApiError(400, "No password set for this account");
    }

    const isValidPass = await comparePassword(
      data.oldPassword,
      user.password
    );
    if (!isValidPass) {
      throw new ApiError(401, "Old password is incorrect");
    }

    const hashed = await hashPassword(data.password);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return "Password changed successfully";
  }

  // ── Admin deletes a user by ID ──────────────────────────────────────────

  async deleteUser(targetUserId: string, callerRole: string) {
    const target = await userRepo.findUser("id", targetUserId, true);

    // Only super_admin can delete other admins/super_admins
    if (
      (target.role === "admin" || target.role === "super_admin") &&
      callerRole !== "super_admin"
    ) {
      throw new ApiError(403, "You can only delete regular users");
    }

    // Prevent super_admin from deleting admins/super_admins through this endpoint
    if (target.role === "super_admin" && callerRole === "super_admin") {
      throw new ApiError(400, "Use the admin delete endpoint (/admin/delete/:id) to manage other super admins.");
    }

    // Send confirmation email BEFORE deleting
    await sendEmail({
      to: target.email as string,
      subject: `Account deleted by admin — ${env.MAIL_FROM_NAME}`,
      html: deleteAccountConfirmationTemplate({
        name: target.name as string,
      }),
    });

    // Clean up Cloudinary avatar
    if (target.avatarPublicId) {
      await cloudinary.deleteFile(target.avatarPublicId).catch(() => {});
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    return { message: `User ${target.email} deleted successfully` };
  }

  // ── Super admin gets all users (all roles) ──────────────────────────────

  async getAllUsers(page: number = 1, limit: number = 10) {
    return userRepo.getAllUsers(page, limit);
  }

  // ── Admin updates own profile ───────────────────────────────────────────

  async updateSelf(adminId: string, data: AdminUpdateSelfInput, avatarBuffer?: Buffer) {
    const user = await userRepo.findUser("id", adminId, true);

    if (user.role !== "admin" && user.role !== "super_admin") {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;

    if (data.email !== undefined) {
      if (data.email !== user.email) {
        await userRepo.findUser("email", data.email, false);
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
      where: { id: adminId },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      avatar: updated.avatar,
      phone: updated.phone,
      isEmailVerified: updated.isEmailVerified,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // ── Super admin deletes an admin/super_admin ────────────────────────────

  async deleteAdmin(targetAdminId: string, callerId: string) {
    if (targetAdminId === callerId) {
      throw new ApiError(400, "You cannot delete your own account. Use the admin delete-self endpoint instead.");
    }

    const target = await userRepo.findUser("id", targetAdminId, true);

    if (target.role !== "admin" && target.role !== "super_admin") {
      throw new ApiError(400, "Target user is not an admin");
    }

    // Send confirmation email before deleting
    await sendEmail({
      to: target.email as string,
      subject: `Admin account deleted — ${env.MAIL_FROM_NAME}`,
      html: deleteAccountConfirmationTemplate({
        name: target.name as string,
      }),
    });

    if (target.avatarPublicId) {
      await cloudinary.deleteFile(target.avatarPublicId).catch(() => {});
    }

    await prisma.user.delete({ where: { id: targetAdminId } });

    return { message: `Admin ${target.email} deleted successfully` };
  }

  // ── Admin Refresh Token ─────────────────────────────────────────────────

  async refreshToken(token: string) {
    let payload: JwtPayload;
    try {
      // Admin refresh tokens use the same admin secret as access tokens
      payload = auth.verifyToken(token, "admin", "refresh");
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await userRepo.findUser("id", payload.id, true);

    const hashedIncoming = auth.hashToken(token);
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
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  // ── Get a single user/admin by ID ──────────────────────────────────────

  async getUserById(targetUserId: string) {
    const user = await userRepo.findUser("id", targetUserId, true);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      isPaid: user.isPaid,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ── Super admin updates an admin/super_admin ────────────────────────────

  async updateAdmin(targetAdminId: string, data: AdminUpdateUserInput) {
    const target = await userRepo.findUser("id", targetAdminId, true);

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.email !== undefined) {
      if (data.email !== target.email) {
        await userRepo.findUser("email", data.email, false);
      }
      updateData.email = data.email;
    }

    if (data.role !== undefined) {
      // Prevent demoting the last super_admin
      if (target.role === "super_admin" && data.role !== "super_admin") {
        const superAdminCount = await prisma.user.count({
          where: { role: "super_admin" },
        });
        if (superAdminCount <= 1) {
          throw new ApiError(400, "Cannot demote the last super admin");
        }
      }
      updateData.role = data.role as Role;
    }

    const updated = await prisma.user.update({
      where: { id: targetAdminId },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      avatar: updated.avatar,
      phone: updated.phone,
      isEmailVerified: updated.isEmailVerified,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // ── Dashboard Trends (month-over-month growth) ────────────────────────

  async getDashboardTrends() {
    const now = new Date();

    // Start of current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of previous month
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    // Helper to get count in a date range
    const countInRange = async (
      model: "user" | "listing" | "userReview",
      start: Date,
      end: Date
    ) => {
      const where: Record<string, unknown> = {
        createdAt: { gte: start, lt: end },
      };

      if (model === "user") {
        return prisma.user.count({ where });
      }
      if (model === "listing") {
        return prisma.listing.count({ where });
      }
      return prisma.userReview.count({ where });
    };

    // Count admin users (role-based, not createdAt-based for total)
    const countAdminInRange = async (start: Date, end: Date) => {
      return prisma.user.count({
        where: {
          role: { in: ["admin", "super_admin"] },
          createdAt: { gte: start, lt: end },
        },
      });
    };

    const [
      usersThisMonth,
      usersLastMonth,
      adminsThisMonth,
      adminsLastMonth,
      listingsThisMonth,
      listingsLastMonth,
      reviewsThisMonth,
      reviewsLastMonth,
    ] = await Promise.all([
      countInRange("user", currentMonthStart, now),
      countInRange("user", previousMonthStart, currentMonthStart),
      countAdminInRange(currentMonthStart, now),
      countAdminInRange(previousMonthStart, currentMonthStart),
      countInRange("listing", currentMonthStart, now),
      countInRange("listing", previousMonthStart, currentMonthStart),
      countInRange("userReview", currentMonthStart, now),
      countInRange("userReview", previousMonthStart, currentMonthStart),
    ]);

    // Also get total counts
    const [
      totalUsers,
      totalAdmins,
      activeUsers,
      verifiedUsers,
      totalListings,
      totalReviews,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ["admin", "super_admin"] } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.listing.count(),
      prisma.userReview.count(),
    ]);

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? "+100%" : "0%";
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? "+" : "";
      return `${sign}${change.toFixed(0)}%`;
    };

    return {
      trends: {
        users: {
          value: calcTrend(usersThisMonth, usersLastMonth),
          positive: usersThisMonth >= usersLastMonth,
        },
        admins: {
          value: calcTrend(adminsThisMonth, adminsLastMonth),
          positive: adminsThisMonth >= adminsLastMonth,
        },

        listings: {
          value: calcTrend(listingsThisMonth, listingsLastMonth),
          positive: listingsThisMonth >= listingsLastMonth,
        },
        reviews: {
          value: calcTrend(reviewsThisMonth, reviewsLastMonth),
          positive: reviewsThisMonth >= reviewsLastMonth,
        },
      },
      totals: {
        totalUsers,
        totalAdmins,
        activeUsers,
        verifiedUsers,
        totalListings,
        totalReviews,
      },
    };
  }
}
