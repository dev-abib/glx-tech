import { User, Prisma } from "@prisma/client";

export interface IUser {
  id: string;
  name: string;
  email: string;
}

// Safe user returned after creation (excludes sensitive fields)
export type SafeUser = Omit<
  User,
  | "password"
  | "otp"
  | "otpExpiresAt"
  | "otpAttempts"
  | "refreshToken"
  | "accessToken"
  | "resetToken"
>;

// Seller info with addresses as returned by getMe
export type SellerInfoWithAddress = Prisma.SellerInfoGetPayload<{
  include: { sellerAddress: true };
}>;

// Shape returned by getMe (sellerInfo + sanitized user)
export interface GetMeResponse {
  sellerInfo: SellerInfoWithAddress | null;
  safeUser: SafeUser;
}

// Login response data shape
export interface LoginResponseData {
  token: {
    accessToken: string;
    refreshToken: string;
  };
  user: {
    name: string | null;
    email: string | null;
    avatar: string | null;
  };
}

// Refresh token response data shape
export interface RefreshTokenResponseData {
  accessToken: string;
  refreshToken: string;
}
