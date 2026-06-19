import { baseTemplate } from "../base.template.js";
import { env } from "../../../config/env.js";
import type { ContactEmailProps } from "../../email.types.js";

export const newInquiryNotificationTemplate = ({
  fullName,
  email,
  phoneNumber,
  subject,
  message,
  submittedAt,
}: ContactEmailProps): string => {
  const date = submittedAt
    ? new Date(submittedAt).toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
      });

  const content = `
    <div style="margin-bottom: 20px;">
      <p style="margin: 0 0 4px;font-size: 12px;color: #6b7280;text-transform: uppercase;letter-spacing: 0.5px;">Received</p>
      <p style="margin: 0;font-size: 14px;color: #111827;">${date}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;width:100px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;vertical-align:top;">Name</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">${fullName}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;vertical-align:top;">Email</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">
          <a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a>
        </td>
      </tr>
      ${
        phoneNumber
          ? `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;vertical-align:top;">Phone</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">
          <a href="tel:${phoneNumber}" style="color:#2563eb;text-decoration:none;">${phoneNumber}</a>
        </td>
      </tr>`
          : ""
      }
      ${
        subject
          ? `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;vertical-align:top;">Subject</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">${subject}</td>
      </tr>`
          : ""
      }
    </table>

    <div style="margin-top: 16px;">
      <p style="margin: 0 0 8px;font-size: 12px;color: #6b7280;text-transform: uppercase;letter-spacing: 0.5px;">Message</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${message}</div>
    </div>

    <div style="margin-top: 28px;padding-top:20px;border-top:1px solid #e5e7eb;">
      <a href="${env.APP_URL}/admin/cms/contacts" style="display:inline-block;padding:10px 24px;background:#111827;color:#ffffff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">
        View in Dashboard
      </a>
    </div>
  `;

  return baseTemplate({
    title: `New Contact Inquiry — ${fullName}`,
    content,
  });
};
