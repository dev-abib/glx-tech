import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const transporter = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: Number(env.MAIL_PORT),
  secure: Number(env.MAIL_PORT) === 465,

  auth: {
    user: env.MAIL_USERNAME,
    pass: env.MAIL_PASSWORD,
  },

  connectionTimeout: 10000,
  debug: false,
  logger: false,
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    console.error("Email send failed:", error);
    throw error;
  }
};
