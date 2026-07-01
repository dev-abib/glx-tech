import { env } from "../../../config/env.js";

interface CampaignEmailShellProps {
  subject: string;
  heading: string;
  bodyHtml: string;
  ctaText?: string | null;
  ctaLink?: string | null;
  unsubscribeToken: string;
}

/**
 * Wraps campaign content in a branded, mobile-responsive HTML email shell.
 *
 * The unsubscribe link uses the subscriber's unique token (never the raw email)
 * for security and GDPR compliance.
 */
export const wrapInCampaignEmailShell = ({
  subject,
  heading,
  bodyHtml,
  ctaText,
  ctaLink,
  unsubscribeToken,
}: CampaignEmailShellProps): string => {
  const year = new Date().getFullYear();
  const siteName = env.SITE_NAME || "GLX Tech";
  const frontendUrl = env.FRONTEND_URL && env.FRONTEND_URL !== "#" ? env.FRONTEND_URL : env.SITE_URL || "#";
  const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${unsubscribeToken}`;

  const ctaButton = ctaText && ctaLink
    ? `
      <tr>
        <td align="center" style="padding: 8px 0 24px;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td align="center" style="
                background:#4f46e5;
                border-radius:12px;
                padding:0;
              ">
                <a href="${ctaLink}" target="_blank" style="
                  display:inline-block;
                  padding:14px 36px;
                  font-size:15px;
                  font-weight:600;
                  color:#ffffff;
                  text-decoration:none;
                  letter-spacing:0.3px;
                ">${ctaText}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="
            background:#ffffff;
            border-radius:20px;
            overflow:hidden;
            border:1px solid #e2e5ea;
            max-width:560px;
          ">
            <!-- Header / Logo -->
            <tr>
              <td style="background:#0a0a0a;padding:28px 32px 24px;">
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="
                      width:36px;height:36px;
                      background:#4f46e5;
                      border-radius:10px;
                      text-align:center;
                      vertical-align:middle;
                      font-size:18px;
                      font-weight:700;
                      color:#ffffff;
                    ">G</td>
                    <td style="
                      padding-left:12px;
                      font-size:16px;
                      font-weight:600;
                      color:#ffffff;
                      letter-spacing:0.2px;
                      vertical-align:middle;
                    ">${siteName}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Spacer -->
            <tr><td style="height:24px;"></td></tr>

            <!-- Heading -->
            <tr>
              <td style="padding:0 32px;">
                <h1 style="
                  margin:0;
                  color:#111827;
                  font-size:26px;
                  font-weight:700;
                  letter-spacing:-0.5px;
                  line-height:1.3;
                ">${heading}</h1>
              </td>
            </tr>

            <!-- Spacer -->
            <tr><td style="height:16px;"></td></tr>

            <!-- Body Content (rich HTML) -->
            <tr>
              <td style="padding:0 32px;font-size:15px;color:#374151;line-height:1.75;">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Spacer -->
            <tr><td style="height:8px;"></td></tr>

            <!-- CTA Button -->
            ${ctaButton}

            <!-- Spacer -->
            <tr><td style="height:8px;"></td></tr>

            <!-- Footer / Unsubscribe -->
            <tr>
              <td style="border-top:1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 32px;">
                  <tr>
                    <td style="font-size:12px;color:#9ca3af;line-height:1.6;">
                      You are receiving this email because you subscribed to ${siteName} updates.
                      <br />
                      If you no longer wish to receive these emails, you can
                      <a href="${unsubscribeUrl}" style="color:#4f46e5;text-decoration:underline;">unsubscribe here</a>.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:12px;font-size:11px;color:#9ca3af;">
                      &copy; ${year} ${siteName}. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Footer note -->
          <p style="margin-top:14px;font-size:11px;color:#9ca3af;text-align:center;">
            This is an automated email. Please do not reply to this message.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
};
