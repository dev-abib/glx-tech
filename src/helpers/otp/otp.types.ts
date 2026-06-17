export interface OTPPayload {
  otp: string;
  hashedOtp: string;
  expiresAt: Date;
}
