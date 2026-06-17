import { Schema, model } from "mongoose";
import type { InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      default: null,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    password: {
      type: String,
      required: false,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpAttempts: {
      type: Number,
      max: 3,
      default: 0,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    guestExpiresAt: {
      type: Date,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "apple", "guest"],
      default: "local",
    },
    subscription: {
      planKey: { type: String, trim: true, lowercase: true, default: null },
    },
    billingCycle: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "free",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
      default: "free",
    },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    currentPeriodEnd: { type: Number, default: null },
  },
  {
    timestamps: true,
  }
);

export type User = InferSchemaType<typeof userSchema>;

export const UserModel = model<User>("User", userSchema);
