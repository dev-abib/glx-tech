/**
 * E2E verification: subscription flow → seller onboarding.
 *
 * Verifies the two recent fixes against a live server:
 *   A. A regular (non-seller) user can create a subscription checkout
 *      (previously 401 "Seller access required").
 *   B. GET /stripe/subscription/my-plan + portal work before becoming a seller.
 *   C. The onboarding gate still rejects users who have NOT paid (403).
 *   D. The async webhook-race fallback: user pays (simulated with a real
 *      test-mode Stripe subscription; the webhook is NOT fired), then
 *      update-as-seller succeeds by syncing the purchase from Stripe.
 *   E. Fresh seller tokens carry the seller role and seller-only endpoints
 *      work; my-plan reflects the purchased plan.
 *
 * Run: npx tsx scripts/verify-subscription-seller-flow.ts
 * (backend must be running; BASE defaults to the local server)
 */

const BASE = process.env.BASE_URL || "http://localhost:5000/v1";

let prisma: any;
let stripe: any;
let userId: string | null = null;
let createdServiceId: string | null = null;
let checkoutSessionId: string | null = null;
let createdSubscriptionId: string | null = null;

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
  console.log("═══ Verifying Subscription → Seller Onboarding Flow ═══\n");

  const [{ getPrismaClient }, stripeConfig] = await Promise.all([
    import("../src/config/database.js"),
    import("../src/config/stripe.config.js"),
  ]);
  prisma = getPrismaClient();
  stripe = stripeConfig.stripe;

  const suffix = Date.now();
  const email = `verify-sub-${suffix}@example.com`;
  const password = "Test@1234";

  try {
    // ── 0. Plan precondition ──────────────────────────────────────────
    console.log("0. Checking Premium plan + Stripe price...");
    const premiumPlan = await prisma.subscriptionPlan.findUnique({
      where: { slug: "premium" },
    });
    if (!premiumPlan || !premiumPlan.stripePriceIdMonthly) {
      check(
        false,
        "Premium plan with a Stripe price not found — run `npm run seed:plans`"
      );
      return;
    }
    console.log(`  ✅ Premium plan ready (${premiumPlan.id})`);

    // ── 1. Register + verify + login (regular user) ───────────────────
    console.log("\n1. Registering a regular user...");
    const regRes = await fetch(`${BASE}/users/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Verify Seller",
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

    // ── A. Checkout as a REGULAR user (the original bug) ──────────────
    console.log("\nA. POST /stripe/subscription/checkout as a regular user...");
    const checkoutRes = await fetch(`${BASE}/stripe/subscription/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planId: premiumPlan.id, billingCycle: "monthly" }),
    });
    const checkoutBody = await checkoutRes.json();
    check(
      checkoutRes.status === 201 && Boolean(checkoutBody.data?.url),
      `Checkout created for non-seller (201) — got ${checkoutRes.status}`,
      checkoutBody
    );
    if (checkoutRes.status === 401) {
      console.error(
        "  ⚠️  Got 401 — the seller-gate fix is NOT live on this server."
      );
    }
    if (checkoutRes.status === 201) {
      checkoutSessionId = checkoutBody.data?.sessionId ?? null;
    }

    // ── B. my-plan + portal as a regular user ─────────────────────────
    console.log("\nB. Subscription endpoints before becoming a seller...");
    const myPlanRes = await fetch(`${BASE}/stripe/subscription/my-plan`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const myPlanBody = await myPlanRes.json();
    check(
      myPlanRes.status === 200,
      `GET /stripe/subscription/my-plan as non-seller (200) — got ${myPlanRes.status}`,
      myPlanBody
    );
    check(
      myPlanBody.data?.plan === null && myPlanBody.data?.isFree === true,
      "my-plan reports no plan + isFree=true for a non-seller"
    );

    const portalRes = await fetch(
      `${BASE}/stripe/subscription/portal?return_url=${encodeURIComponent(
        "http://localhost:5173/profile"
      )}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const portalBody = await portalRes.json();
    check(
      portalRes.status === 200 && Boolean(portalBody.data?.url),
      `GET /stripe/subscription/portal as non-seller (200) — got ${portalRes.status}`,
      portalBody
    );

    // ── C. Onboarding gate rejects non-payers ─────────────────────────
    console.log("\nC. update-as-seller WITHOUT a paid subscription...");
    let serviceId: string;
    const existingService = await prisma.service.findFirst();
    if (existingService) {
      serviceId = existingService.id;
    } else {
      const hero = await prisma.hero.create({
        data: { title: "Verify Hero", sub_title: "Sub" },
      });
      const svc = await prisma.service.create({
        data: {
          name: "Verify Service",
          title: "Verify Service",
          details: "Details",
          iconPublicId: "verify",
          heroId: hero.id,
        },
      });
      serviceId = svc.id;
      createdServiceId = serviceId;
    }
    const sellerData = {
      storeName: "Verify Test Store",
      servicesId: [serviceId],
      insuranceStatus: "yes" as const,
      socialLInk: "https://example.com",
      businessNumber: "BUS-VERIFY-1",
      businessEmail: email,
      addresses: [
        {
          streetAddress: "123 Verify St",
          city: "Test City",
          state: "TS",
          zipCode: "12345",
        },
      ],
    };
    const gateRes = await fetch(`${BASE}/users/update-as-seller`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sellerData),
    });
    const gateBody = await gateRes.json();
    check(
      gateRes.status === 403,
      `Onboarding blocked for non-payer (403) — got ${gateRes.status}: "${gateBody.message}"`,
      gateBody
    );

    // ── D. Webhook-race: paid on Stripe but webhook never fired ───────
    console.log("\nD. Simulating 'paid but webhook hasn't fired' (race)...");
    // stripeCustomerId was saved during checkout (step A). Create a real
    // test-mode subscription on that customer WITHOUT triggering the webhook.
    const userAfterCheckout = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    check(
      Boolean(userAfterCheckout?.stripeCustomerId),
      "stripeCustomerId present after checkout",
      userAfterCheckout
    );
    if (!userAfterCheckout?.stripeCustomerId) return;

    const sub = await stripe.subscriptions.create({
      customer: userAfterCheckout.stripeCustomerId,
      items: [{ price: premiumPlan.stripePriceIdMonthly }],
      trial_period_days: 3,
      metadata: {
        planId: premiumPlan.id,
        planSlug: premiumPlan.slug,
        userId,
      },
    });
    createdSubscriptionId = sub.id;
    console.log(
      `  ✅ Test subscription created: ${sub.id} (status: ${sub.status})`
    );
    check(
      sub.status === "trialing" || sub.status === "active",
      `Stripe subscription is ${sub.status}`
    );

    // Local DB must NOT show the plan yet (that's the race we're fixing).
    const beforeOnboard = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlanId: true, subscriptionStatus: true },
    });
    check(
      !beforeOnboard?.subscriptionPlanId,
      "Local DB still shows no plan (webhook not fired) — race reproduced"
    );

    // Now onboarding must SUCCEED via the Stripe fallback.
    const onboardRes = await fetch(`${BASE}/users/update-as-seller`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sellerData),
    });
    const onboardBody = await onboardRes.json();
    const sellerToken = onboardBody.data?.data?.accessToken;
    check(
      onboardRes.ok && Boolean(sellerToken),
      `update-as-seller succeeds during the race (200) — got ${onboardRes.status}`,
      onboardBody
    );
    check(
      onboardBody.data?.data?.role === "seller",
      `New role is 'seller' (got ${onboardBody.data?.data?.role})`
    );
    if (!onboardRes.ok || !sellerToken) return;

    // DB should now be synced by the fallback.
    const afterOnboard = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlanId: true,
        subscriptionStatus: true,
        isSeller: true,
        role: true,
        isPaid: true,
      },
    });
    check(
      afterOnboard?.subscriptionPlanId === premiumPlan.id &&
        afterOnboard?.subscriptionStatus === "trialing",
      "Fallback synced plan + trialing status into the DB"
    );
    check(
      afterOnboard?.isSeller === true && afterOnboard?.role === "seller",
      "User is now flagged as a seller"
    );
    check(afterOnboard?.isPaid === true, "isPaid=true");

    // ── E. Seller experience ──────────────────────────────────────────
    console.log("\nE. Post-onboarding checks as a seller...");
    const sellerPlanRes = await fetch(`${BASE}/stripe/subscription/my-plan`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const sellerPlanBody = await sellerPlanRes.json();
    check(
      sellerPlanRes.status === 200 && sellerPlanBody.data?.plan?.slug === "premium",
      "my-plan now shows the Premium plan",
      sellerPlanBody
    );
    check(
      sellerPlanBody.data?.isActive === true,
      "my-plan reports isActive=true (trialing)"
    );

    const addressesRes = await fetch(`${BASE}/users/addresses`, {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const addressesBody = await addressesRes.json();
    check(
      addressesRes.status === 200 && Array.isArray(addressesBody.data),
      "Seller-only endpoint (GET /users/addresses) works with fresh seller token",
      addressesBody
    );

    console.log("\n═══ Verification complete ═══");
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
    if (createdSubscriptionId) {
      await stripe.subscriptions.cancel(createdSubscriptionId).catch(() => {});
      console.log("  ✅ Canceled test Stripe subscription");
    }
    if (checkoutSessionId) {
      await stripe.checkout.sessions
        .expire(checkoutSessionId)
        .catch(() => {});
      console.log("  ✅ Expired test checkout session");
    }
    if (userId) {
      const si = await prisma.sellerInfo.findUnique({ where: { userId } });
      if (si) {
        await prisma.selleraddress.deleteMany({ where: { sellerId: si.id } });
        await prisma.sellerInfo.deleteMany({ where: { userId } });
      }
      await prisma.unavailableSlot.deleteMany({ where: { sellerId: userId } });
      await prisma.listing.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      console.log("  ✅ Deleted test user + related rows");
    }
    if (createdServiceId) {
      await prisma.service.deleteMany({ where: { id: createdServiceId } });
      console.log("  ✅ Deleted created test service");
    }
  } catch (err) {
    console.warn("  ⚠️  Cleanup warning:", err instanceof Error ? err.message : err);
  }
}

main().then(() => {
  process.exit(failed ? 1 : 0);
});
