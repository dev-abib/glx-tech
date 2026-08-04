/**
 * E2E verification: Free-plan checkout flows through Stripe first.
 *
 * Verifies the free-plan fix:
 *   1. Register + verify + login a regular user.
 *   2. POST /stripe/subscription/checkout with the Free plan.
 *   3. The response must return a REAL Stripe Checkout URL
 *      (https://checkout.stripe.com/...) plus a sessionId — NOT the
 *      direct frontend success link.
 *   4. Retrieves the created Stripe session to confirm it is a $0
 *      subscription session whose success_url points at the frontend
 *      /payment/success page (i.e. user goes Stripe → success page).
 *
 * Run: npx tsx scripts/e2e-free-plan-checkout.ts
 * (backend must be running; BASE defaults to the local server)
 */

const BASE = process.env.BASE_URL || "http://localhost:5000/v1";

let prisma: any;
let stripe: any;
let userId: string | null = null;
let checkoutSessionId: string | null = null;

let failed = false;

function check(ok: boolean, label: string, extra?: unknown): void {
  if (ok) {
    console.log(`  ✅ ${label}`);
  } else {
    failed = true;
    console.error(`  ❌ ${label}`);
    if (extra !== undefined) {
      console.error("     Details:", JSON.stringify(extra, null, 2));
    }
  }
}

async function main() {
  console.log("═══ E2E: Free-plan checkout → Stripe first ═══\n");

  const [{ getPrismaClient }, stripeConfig] = await Promise.all([
    import("../src/config/database.js"),
    import("../src/config/stripe.config.js"),
  ]);
  prisma = getPrismaClient();
  stripe = stripeConfig.stripe;

  const suffix = Date.now();
  const email = `e2e-free-${suffix}@example.com`;
  const password = "Test@1234";

  try {
    // ── 1. Free plan precondition ────────────────────────────────────
    console.log("1. Checking the Free plan...");
    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: { slug: "free" },
    });
    if (!freePlan) {
      check(false, "Free plan not found — run `npm run seed:plans`");
      return;
    }
    check(
      freePlan.priceMonthly === 0 && freePlan.priceAnnual === 0,
      `Free plan is $0 on both cycles (monthly=${freePlan.priceMonthly}, annual=${freePlan.priceAnnual})`
    );

    // ── 2. Register + verify + login ─────────────────────────────────
    console.log("\n2. Registering a regular user...");
    const regRes = await fetch(`${BASE}/users/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "E2E Free",
        email,
        password,
        confirmPassword: password,
      }),
    });
    const regBody = await regRes.json();
    check(regRes.ok, `Register user (${email})`, regBody);
    if (!regRes.ok) return;

    const user = await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });
    userId = user.id;
    console.log(`  ✅ Email verified in DB (${userId})`);

    const loginRes = await fetch(`${BASE}/users/login-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = await loginRes.json();
    const token = loginBody.data?.token?.accessToken;
    check(Boolean(token), "Login returns access token", loginBody);
    if (!token) return;

    // ── 3. Free-plan checkout ────────────────────────────────────────
    console.log("\n3. POST /stripe/subscription/checkout with the Free plan...");
    const checkoutRes = await fetch(`${BASE}/stripe/subscription/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        planId: freePlan.id,
        billingCycle: "monthly",
      }),
    });
    const checkoutBody = await checkoutRes.json();
    check(
      checkoutRes.status === 201,
      `Checkout returns 201 — got ${checkoutRes.status}`,
      checkoutBody
    );

    const returnedUrl: string | undefined = checkoutBody.data?.url;
    const sessionId: string | undefined = checkoutBody.data?.sessionId;

    check(
      typeof returnedUrl === "string" && returnedUrl.startsWith("https://checkout.stripe.com/"),
      `Response URL is a REAL Stripe Checkout URL (not the direct success link)`,
      { url: returnedUrl }
    );
    check(
      Boolean(sessionId),
      "Response includes a Stripe sessionId",
      { sessionId }
    );
    check(
      !returnedUrl?.includes("/payment/success"),
      "URL is NOT the frontend success link"
    );

    if (checkoutRes.status === 201) {
      checkoutSessionId = sessionId ?? null;
    }

    // ── 4. Inspect the Stripe session ────────────────────────────────
    console.log("\n4. Inspecting the Stripe session...");
    if (!sessionId) return;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    check(
      session.mode === "subscription",
      `Session mode is 'subscription' (got ${session.mode})`
    );
    check(
      session.amount_total === 0,
      `Session amount is $0 (got ${session.amount_total})`
    );
    check(
      session.metadata?.planId === freePlan.id,
      "Session metadata carries the Free planId"
    );
    check(
      typeof session.success_url === "string" &&
        session.success_url.includes("/payment/success"),
      `success_url points at the frontend /payment/success page`,
      { success_url: session.success_url }
    );
    check(
      typeof session.cancel_url === "string" &&
        session.cancel_url.includes("/payment/cancel"),
      "cancel_url points at the frontend /payment/cancel page",
      { cancel_url: session.cancel_url }
    );
    check(
      session.payment_method_collection === "if_required",
      "payment_method_collection is 'if_required' (no card needed for $0)"
    );

    // The user must NOT be marked paid yet (activation happens via the
    // checkout.session.completed webhook).
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlanId: true, isPaid: true },
    });
    check(
      dbUser?.subscriptionPlanId === null && dbUser?.isPaid === false,
      "User is not yet activated (waiting on the webhook)",
      dbUser
    );

    console.log("\n═══ E2E verification complete ═══");
    console.log(
      `\n👉 Open this URL in a browser to complete the $0 checkout and confirm the redirect back to the success page:\n   ${returnedUrl}\n`
    );
  } catch (err) {
    failed = true;
    console.error("\n❌ Unexpected error:", err);
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

async function cleanup() {
  console.log("\n── Cleanup ──");
  try {
    if (checkoutSessionId) {
      await stripe.checkout.sessions
        .expire(checkoutSessionId)
        .catch(() => {});
      console.log("  ✅ Expired test checkout session");
    }
    if (userId) {
      await prisma.listing.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      console.log("  ✅ Deleted test user");
    }
  } catch (err) {
    console.warn("  ⚠️  Cleanup warning:", err instanceof Error ? err.message : err);
  }
}

main().then(() => {
  process.exit(failed ? 1 : 0);
});
