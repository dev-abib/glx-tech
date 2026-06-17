export interface BaseEmailProps {
  title: string;
  content: string;
}

export interface OTPEmailProps {
  name: string;
  otp: string;
  email: string;
  expiresAt: Date;
}

export interface ContactEmailProps {
  fullName: string;
  email: string;
  phoneNumber?: string;
  subject?: string;
  message: string;
  submittedAt?: Date;
}

export interface AccountStatusProps {
  name: string;
  email: string;
}

export interface VerificationStatusProps {
  name: string;
  email: string;
  isVerified: boolean;
}

export interface UserMailProps {
  firstName: string;
  lastName: string;
  subject: string;
  message: string;
  sentAt?: Date;
}

export interface RequestTourProps {
  sellerName: string;
  propertyName: string;
  buyerName: string;
  buyerEmail: string;
  phoneNumber?: string;
  message?: string;
  date?: Date;
}
