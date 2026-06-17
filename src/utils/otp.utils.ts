import crypto from "crypto";

export const generateOTP = (length = 4): string => {
  const digits = "0123456789";

  const bytes = crypto.randomBytes(length);

  let otp = "";

  for (let i = 0; i < bytes.length; i++) {
    const index = bytes.readUInt8(i) % 10;
    otp += digits[index];
  }

  return otp;
};

export const hashOTP = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};
