import { baseTemplate } from "../base.template.js";
import { env } from "../../../config/env.js";

export const replyToInquiryTemplate = ({
  name,
  originalMessage,
  replyMessage,
}: {
  name: string;
  originalMessage: string;
  replyMessage: string;
}): string => {
  const content = `
    <p>Dear ${name},</p>
    <p>Thank you for reaching out to us. Here is our response to your inquiry:</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#111827;white-space:pre-wrap;">${replyMessage}</div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    <p style="font-size:12px;color:#6b7280;">Your original message:</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:12px;font-size:13px;color:#6b7280;font-style:italic;white-space:pre-wrap;">${originalMessage}</div>
  `;

  return baseTemplate({
    title: `Reply to Your Inquiry — ${env.SITE_NAME}`,
    content,
  });
};
