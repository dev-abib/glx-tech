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
  plan?: {
    planId: string | null;
    planName: string | null;
    isFree: boolean;
    maxActiveListings: number;
    maxFeaturedListings: number;
    platformFeePercent: number;
    /** How many listings the seller has added so far */
    totalListings: number;
    /** How many of those are featured */
    featuredListings: number;
    /** How many are currently active/available */
    activeListings: number;
  };
  listingUsage?: {
    totalListings: number;
    featuredListings: number;
    activeListings: number;
  };
  /** The subscription period end date (expiration). Null if no active subscription. */
  currentPeriodEnd?: string | null;
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
