import { env } from "../../../config/env.js";
import { baseTemplate } from "../base.template.js";

interface SubscriptionConfirmationProps {
  name: string;
  planName: string;
  /** Price per billing cycle in dollars (e.g. 29.99) */
  price: number;
  billingCycle: "monthly" | "annual";
}

export const subscriptionConfirmationTemplate = ({
  name,
  planName,
  price,
  billingCycle,
}: SubscriptionConfirmationProps): string => {
  const cycleLabel = billingCycle === "annual" ? "year" : "month";
  const formattedPrice = price === 0 ? "$0" : `$${price.toFixed(2)}`;
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="
        display:inline-block;
        width:72px;
        height:72px;
        background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%);
        border-radius:50%;
        text-align:center;
        line-height:72px;
        font-size:36px;
        margin-bottom:20px;
        box-shadow:0 4px 24px rgba(59,130,246,0.15);
      ">✓</div>
      <h2 style="
        margin:0 0 8px;
        font-size:22px;
        font-weight:700;
        color:#111827;
        letter-spacing:-0.3px;
      ">Subscription Confirmed!</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;">
        Welcome aboard, <strong style="color:#111827;">${name}</strong>
      </p>
    </div>

    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;text-align:center;">
      Your payment was successful and your <strong style="color:#111827;">${planName}</strong>
      plan is now active. You can start using all the benefits of your plan right away.
    </p>

    <!-- Receipt summary -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="
          background:#f8fafc;
          border:1.5px solid #bfdbfe;
          border-radius:14px;
          padding:20px;
        ">
          <p style="
            margin:0 0 14px;
            font-size:11px;
            font-weight:600;
            color:#2563eb;
            letter-spacing:1.2px;
            text-transform:uppercase;
          ">Order Summary</p>
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
              <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;">${formattedPrice}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#374151;">Status</td>
              <td style="padding:5px 0;font-size:13px;color:#16a34a;font-weight:600;text-align:right;">Active</td>
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
            background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);
            color:#ffffff;
            text-decoration:none;
            font-size:14px;
            font-weight:600;
            padding:13px 36px;
            border-radius:10px;
            letter-spacing:0.2px;
            box-shadow:0 4px 14px rgba(37,99,235,0.25);
          ">Go to Dashboard →</a>
        </td>
      </tr>
    </table>

    <!-- Help Notice -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="
          background:#fff7ed;
          border:1px solid #fed7aa;
          border-radius:10px;
          padding:12px 14px;
        ">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;padding-right:10px;">
                <div style="
                  width:18px;height:18px;
                  background:#f97316;
                  border-radius:50%;
                  text-align:center;
                  line-height:18px;
                  font-size:10px;
                  font-weight:700;
                  color:#ffffff;
                ">!</div>
              </td>
              <td style="font-size:12.5px;color:#92400e;line-height:1.55;">
                Need an invoice or want to manage your plan? You can manage billing anytime from your account settings.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    title: `Subscription Confirmed — ${planName}`,
    content,
  });
};
