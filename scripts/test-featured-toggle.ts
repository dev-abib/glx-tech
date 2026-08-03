/**
 * End-to-end test for featured listing toggle.
 *
 * 1. Register a user
 * 2. Verify email in DB
 * 3. Login
 * 4. Assign Premium plan (a subscription is required to become a seller)
 * 5. Update as seller (activates seller role + returns new tokens)
 * 6. Switch to the Free plan (featured stays blocked)
 * 7. Create a listing
 * 8. Try toggle featured (should fail - free user)
 * 9. Assign Premium plan to user (featured is Premium-only)
 * 10. Try toggle featured (should succeed)
 * 11. Verify listing isFeatured = true in DB
 *
 * Run: npx tsx scripts/test-featured-toggle.ts
 */

const BASE = "http://localhost:5000/api/v1";

async function main() {
  console.log("═══ Testing Featured Listing Toggle ═══\n");

  const { getPrismaClient } = await import("../src/config/database.js");
  const prisma = getPrismaClient();

  const TEST_EMAIL = `feature-test-${Date.now()}@example.com`;

  // ── 1. Register ──────────────────────────────────────────────────────
  console.log("1. Registering user...");
  const regRes = await fetch(`${BASE}/users/create-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Feature Test",
      email: TEST_EMAIL,
      password: "Test@1234",
      confirmPassword: "Test@1234",
    }),
  });
  const regBody = await regRes.json();
  if (!regRes.ok) { console.error("  ❌ Registration failed:", regBody); return; }
  console.log("  ✅ Registered");

  // ── 2. Verify user ───────────────────────────────────────────────────
  console.log("2. Verifying user in database...");
  const user = await prisma.user.update({
    where: { email: TEST_EMAIL },
    data: { isEmailVerified: true },
  });
  console.log(`  ✅ User ID: ${user.id}`);

  // ── 3. Get or create a service ───────────────────────────────────────
  console.log("3. Getting/creating service...");
  const services = await prisma.service.findMany({ take: 1 });
  let serviceId: string;
  if (services.length === 0) {
    const hero = await prisma.hero.create({
      data: { title: "Test Hero", sub_title: "Test Sub" },
    });
    const svc = await prisma.service.create({
      data: {
        name: "Test Service",
        title: "Test Title",
        details: "Details",
        iconPublicId: "test",
        heroId: hero.id,
      },
    });
    serviceId = svc.id;
  } else {
    serviceId = services[0].id;
  }
  console.log(`  ✅ Service ID: ${serviceId}`);

  // ── 4. Login ─────────────────────────────────────────────────────────
  console.log("4. Logging in...");
  const loginRes = await fetch(`${BASE}/users/login-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: "Test@1234" }),
  });
  const loginBody = await loginRes.json();
  if (!loginRes.ok) { console.error("  ❌ Login failed:", loginBody); await prisma.$disconnect(); return; }
  const token = loginBody.data.token.accessToken;
  console.log("  ✅ Logged in");

  // ── 5. Assign Premium plan (required to become a seller) ─────────────
  // Becoming a seller now requires an active paid subscription — assign
  // the Premium plan first so update-as-seller below passes the gate.
  console.log("5. Assigning Premium plan (required to become a seller)...");
  const premiumPlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "premium" } });
  if (!premiumPlan) {
    console.error("  ❌ Premium plan not found — run the plans seeder first (npm run seed:plans)");
    await prisma.$disconnect();
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionPlanId: premiumPlan.id,
      subscriptionStatus: "active",
      isPaid: true,
    },
  });
  console.log(`  ✅ Premium plan assigned to user: ${premiumPlan.name}`);

  // ── 6. Update as seller ──────────────────────────────────────────────
  console.log("6. Updating as seller...");
  const sellerRes = await fetch(`${BASE}/users/update-as-seller`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      storeName: "Feature Test Store",
      servicesId: [serviceId],
      insuranceStatus: "yes",
      socialLInk: "https://example.com",
      businessNumber: "BUS-123",
      businessEmail: TEST_EMAIL,
      addresses: [{
        streetAddress: "123 Test St",
        city: "Test City",
        state: "TS",
        zipCode: "12345",
      }],
    }),
  });
  const sellerBody = await sellerRes.json();
  if (!sellerRes.ok) { console.error("  ❌ Seller update failed:", sellerBody); await prisma.$disconnect(); return; }
  // update-as-seller activates the seller role and returns fresh tokens.
  const sellerToken = sellerBody.data?.data?.accessToken;
  if (!sellerToken) {
    console.error("  ❌ update-as-seller did not return seller tokens:", sellerBody);
    await prisma.$disconnect();
    return;
  }
  console.log(`  ✅ Seller activated (role: ${sellerBody.data?.data?.role})`);

  // ── 7. Switch to the Free plan so the featured toggle stays blocked ──
  // (maxFeaturedListings = 0, no featured_listing feature) while listing
  // creation still works (Free allows 5 listings).
  console.log("7. Switching to the Free plan...");
  const freePlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: "free" },
  });
  if (!freePlan) {
    console.error("  ❌ Free plan not found — run the plans seeder first (npm run seed:plans)");
    await prisma.$disconnect();
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionPlanId: freePlan.id,
      subscriptionStatus: "active",
      isPaid: false,
    },
  });
  console.log(`  ✅ Free plan assigned to seller: ${freePlan.name}`);

  // ── 8. Get address ID ────────────────────────────────────────────────
  console.log("8. Getting address ID...");
  const sellerInfo = await prisma.sellerInfo.findUnique({
    where: { userId: user.id },
    include: { sellerAddress: true },
  });
  if (!sellerInfo || sellerInfo.sellerAddress.length === 0) {
    console.error("  ❌ No address found"); await prisma.$disconnect(); return;
  }
  const addressId = sellerInfo.sellerAddress[0].id;
  console.log(`  ✅ Address ID: ${addressId}`);

  // ── 9. Create listing ────────────────────────────────────────────────
  console.log("9. Creating listing...");
  const slug = `feature-test-${Date.now()}`;
  const formData = new FormData();
  formData.append("title", "Featured Test Listing");
  formData.append("slug", slug);
  formData.append("serviceId", serviceId);
  formData.append("description", "Testing featured toggle end-to-end");
  formData.append("addressId", addressId);
  formData.append("basePrice", "500");
  formData.append("isAvailable", "true");

  const createRes = await fetch(`${BASE}/listings/create-listing`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: formData,
  });
  const createBody = await createRes.json();
  if (!createRes.ok) {
    console.error("  ❌ Create listing failed:", JSON.stringify(createBody, null, 2));
    await prisma.$disconnect();
    return;
  }
  const listingId = createBody.data?.data?.listingId || createBody.data?.listingId;
  console.log(`  ✅ Listing created! ID: ${listingId}`);

  // ── 10. Try toggle featured (should fail - free user) ────────────────
  console.log("\n10. Trying to toggle featured (free user — should fail)...");
  const toggleFailRes = await fetch(`${BASE}/listings/toggle-featured/${listingId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const toggleFailBody = await toggleFailRes.json();
  if (!toggleFailRes.ok) {
    console.log(`  ✅ Expected failure: ${toggleFailBody.message}`);
  } else {
    console.log(`  ⚠️  Unexpected success: ${JSON.stringify(toggleFailBody)}`);
  }

  // ── 11. Assign Premium plan to user ─────────────────────────────────
  // Featured listings are Premium-only — Professional (maxFeatured = 0) would fail.
  console.log("\n11. Assigning Premium plan to user...");
  if (!premiumPlan) {
    console.error("  ❌ Premium plan not found in DB");
    await prisma.$disconnect();
    return;
  }
  console.log(`  Found plan: ${premiumPlan.name} (maxFeatured: ${premiumPlan.maxFeaturedListings})`);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionPlanId: premiumPlan.id,
      subscriptionStatus: "active",
    },
  });
  console.log("  ✅ Premium plan assigned");

  // Clear subscription service cache
  // Note: this only clears the cache in THIS script's process — the API
  // server keeps its own 30s in-memory cache, so if step 10 is flaky wait
  // ~30s or restart the server before re-running.
  const { SubscriptionService } = await import("../src/modules/plans/subscription.service.js");
  const subService = new SubscriptionService();
  subService.invalidateUserCache(user.id);
  console.log("  ✅ Cache invalidated (script process only)");

  // ── 12. Try toggle featured (should succeed) ────────────────────────
  console.log("\n12. Trying to toggle featured (with Premium plan)...");
  const toggleSuccessRes = await fetch(`${BASE}/listings/toggle-featured/${listingId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const toggleSuccessBody = await toggleSuccessRes.json();
  if (toggleSuccessRes.ok) {
    console.log(`  ✅ SUCCESS! ${toggleSuccessBody.data?.message || toggleSuccessBody.message}`);
    console.log(`  isFeatured: ${toggleSuccessBody.data?.isFeatured}`);
  } else {
    console.error(`  ❌ Toggle failed: ${toggleSuccessBody.message}`);
  }

  // ── 13. Verify in DB ────────────────────────────────────────────────
  console.log("\n13. Verifying listing in database...");
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, isFeatured: true },
  });
  if (listing) {
    console.log(`  Listing ${listing.id}: isFeatured = ${listing.isFeatured}`);
    if (listing.isFeatured) {
      console.log("  ✅ FEATURED LISTING WORKS!");
    } else {
      console.log("  ❌ Listing is NOT featured");
    }
  } else {
    console.log("  ❌ Listing not found in DB");
  }

  await prisma.$disconnect();
  console.log("\n═══ Test Complete ═══");
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
