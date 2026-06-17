
import { generateOTP, hashOTP } from '../../utils/otp.utils.js';
import { OTPPayload } from './otp.types.js';



export const createOTP = (): OTPPayload => {
  const otp = generateOTP(4);

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

  return {
    otp,
    hashedOtp: hashOTP(otp),
    expiresAt,
  };
};

export const verifyOTP = (
  inputOtp: string,
  storedHash: string,
  expiresAt: Date
): boolean => {
  if (new Date() > expiresAt) return false;

  const hashedInput = hashOTP(inputOtp);
  return hashedInput === storedHash;
};
