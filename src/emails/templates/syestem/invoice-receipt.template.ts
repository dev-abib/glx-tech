import { env } from "../../../config/env.js";
import { baseTemplate } from "../base.template.js";

interface InvoiceReceiptProps {
  name: string;
  planName: string;
  /** Amount paid in dollars (e.g. 49.99). */
  amount: number;
  /** Billing cycle label, e.g. "monthly" or "annual". */
  billingCycle: "monthly" | "annual";
  /** ISO date string for the current period end, e.g. 2026-08-31. */
  periodEnd?: string;
}

/**
 * Receipt / invoice email sent after every successful Stripe payment
 * (initial checkout, renewals and future invoices via `invoice.paid`).
 */
export const invoiceReceiptTemplate = ({
  name,
  planName,
  amount,
  billingCycle,
  periodEnd,
}: InvoiceReceiptProps): string => {
  const cycleLabel = billingCycle === "annual" ? "year" : "month";
  const formattedAmount = `$${amount.toFixed(2)}`;
  const formattedPeriodEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="
        display:inline-block;
        width:72px;
        height:72px;
        background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);
        border-radius:50%;
        text-align:center;
        line-height:72px;
        font-size:36px;
        margin-bottom:20px;
        box-shadow:0 4px 24px rgba(16,185,129,0.15);
      ">✓</div>
      <h2 style="
        margin:0 0 8px;
        font-size:22px;
        font-weight:700;
        color:#111827;
        letter-spacing:-0.3px;
      ">Payment Receipt</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;">
        Hi <strong style="color:#111827;">${name}</strong>, thanks for your payment
      </p>
    </div>

    <!-- Receipt summary -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="
          background:#f8fafc;
          border:1.5px solid #a7f3d0;
          border-radius:14px;
          padding:20px;
        ">
          <p style="
            margin:0 0 14px;
            font-size:11px;
            font-weight:600;
            color:#059669;
            letter-spacing:1.2px;
            text-transform:uppercase;
          ">Invoice Summary</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#374151;">Plan</td>
              <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;">${planName}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#374151;">Billing cycle</td>
              <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;text-transform:capitalize;">${cycleLabel}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#374151;">Amount paid</td>
              <td style="padding:5px 0;font-size:13px;color:#059669;font-weight:700;text-align:right;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#374151;">Next billing date</td>
              <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;">${formattedPeriodEnd}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#374151;">Status</td>
              <td style="padding:5px 0;font-size:13px;color:#16a34a;font-weight:600;text-align:right;">Paid</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;">
          <a href="${env.APP_URL}" style="
            display:inline-block;
            background:linear-gradient(135deg,#059669 0%,#047857 100%);
            color:#ffffff;
            text-decoration:none;
            font-size:14px;
            font-weight:600;
            padding:13px 36px;
            border-radius:10px;
            letter-spacing:0.2px;
            box-shadow:0 4px 14px rgba(5,150,105,0.25);
          ">Go to Dashboard →</a>
        </td>
      </tr>
    </table>

    <!-- Help Notice -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="
          background:#f0fdf4;
          border:1px solid #bbf7d0;
          border-radius:10px;
          padding:12px 14px;
        ">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;padding-right:10px;">
                <div style="
                  width:18px;height:18px;
                  background:#16a34a;
                  border-radius:50%;
                  text-align:center;
                  line-height:18px;
                  font-size:10px;
                  font-weight:700;
                  color:#ffffff;
                ">i</div>
              </td>
              <td style="font-size:12.5px;color:#166534;line-height:1.55;">
                This is a receipt for your recent payment. Need to manage your
                plan or billing details? You can do so anytime from your account settings.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    title: `Payment Receipt — ${planName}`,
    content,
  });
};
