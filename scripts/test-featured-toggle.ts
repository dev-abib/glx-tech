/**
 * End-to-end test for featured listing toggle.
 *
 * 1. Register a user
 * 2. Verify email in DB
 * 3. Login
 * 4. Update as seller
 * 5. Switch role to seller
 * 6. Create a listing
 * 7. Try toggle featured (should fail - free user)
 * 8. Assign Professional plan to user
 * 9. Try toggle featured (should succeed)
 * 10. Verify listing isFeatured = true in DB
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
      phone: "+1234567890",
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

  // ── 5. Update as seller ──────────────────────────────────────────────
  console.log("5. Updating as seller...");
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
  if (!sellerRes.ok) { console.error("  ❌ Seller update failed:", await sellerRes.json()); await prisma.$disconnect(); return; }
  console.log("  ✅ Seller profile created");

  // ── 6. Switch role to seller ─────────────────────────────────────────
  console.log("6. Switching role to seller...");
  const switchRes = await fetch(`${BASE}/users/switch-role`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const switchBody = await switchRes.json();
  if (!switchRes.ok) { console.error("  ❌ Switch role failed:", switchBody); await prisma.$disconnect(); return; }
  const sellerToken = switchBody.data.accessToken;
  console.log("  ✅ Role switched to seller");

  // ── 7. Get address ID ────────────────────────────────────────────────
  console.log("7. Getting address ID...");
  const sellerInfo = await prisma.sellerInfo.findUnique({
    where: { userId: user.id },
    include: { sellerAddress: true },
  });
  if (!sellerInfo || sellerInfo.sellerAddress.length === 0) {
    console.error("  ❌ No address found"); await prisma.$disconnect(); return;
  }
  const addressId = sellerInfo.sellerAddress[0].id;
  console.log(`  ✅ Address ID: ${addressId}`);

  // ── 8. Create listing ────────────────────────────────────────────────
  console.log("8. Creating listing...");
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

  // ── 9. Try toggle featured (should fail - free user) ─────────────────
  console.log("\n9. Trying to toggle featured (free user — should fail)...");
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

  // ── 10. Assign Professional plan to user ────────────────────────────
  console.log("\n10. Assigning Professional plan to user...");
  const proPlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "professional" } });
  if (!proPlan) {
    console.error("  ❌ Professional plan not found in DB");
    await prisma.$disconnect();
    return;
  }
  console.log(`  Found plan: ${proPlan.name} (maxFeatured: ${proPlan.maxFeaturedListings})`);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionPlanId: proPlan.id,
      subscriptionStatus: "active",
    },
  });
  console.log("  ✅ Professional plan assigned");

  // Clear subscription service cache
  const { SubscriptionService } = await import("../src/modules/plans/subscription.service.js");
  const subService = new SubscriptionService();
  subService.invalidateUserCache(user.id);
  console.log("  ✅ Cache invalidated");

  // ── 11. Try toggle featured (should succeed) ────────────────────────
  console.log("\n11. Trying to toggle featured (with Professional plan)...");
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

  // ── 12. Verify in DB ────────────────────────────────────────────────
  console.log("\n12. Verifying listing in database...");
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
