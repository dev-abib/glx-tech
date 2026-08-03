/**
 * Integration test for the listing creation flow.
 *
 * Steps:
 *  1. Register a user
 *  2. Manually verify the user (set isEmailVerified in DB)
 *  3. Login to get tokens
 *  4. Try update-as-seller WITHOUT a subscription → expect 403
 *  5. Switch-role gates: no seller profile → 400; profile but no
 *     subscription → 403
 *  6. Assign a paid plan (a subscription is required to become a seller)
 *  7. Update user as seller (activates seller role + returns new tokens)
 *  8. Switch-role round trip (user ⇄ seller) → both succeed with 200
 *  9. Create a listing using the addressId created in step 8
 *  10. Fetch the listing to verify it was created
 *
 * Run: npx tsx scripts/test-listing-flow.ts
 */

const BASE = "http://localhost:5000/api/v1";

const TEST_USER = {
  name: "Test Seller",
  email: `test-seller-${Date.now()}@example.com`,
  password: "Test@1234",
  confirmPassword: "Test@1234",
};

const SELLER_DATA = {
  storeName: "Test Store",
  servicesId: [] as string[],
  insuranceStatus: "yes" as const,
  socialLInk: "https://example.com",
  businessNumber: "BUS-12345",
  businessEmail: "test-seller@example.com",
  addresses: [
    {
      streetAddress: "1600 Amphitheatre Parkway",
      city: "Mountain View",
      state: "CA",
      zipCode: "94043",
    },
  ],
};

async function main() {
  console.log("═══ Testing Listing Creation Flow ═══\n");

  // ── 1. Register ──────────────────────────────────────────────────────
  console.log("1. Registering user...");
  const regRes = await fetch(`${BASE}/users/create-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(TEST_USER),
  });
  const regBody = await regRes.json();
  if (!regRes.ok) {
    console.error("  ❌ Registration failed:", regBody);
    return;
  }
  console.log(`  ✅ Registered: ${TEST_USER.email}`);

  // ── 2. Verify user in DB ─────────────────────────────────────────────
  console.log("2. Verifying user in database...");
  const { getPrismaClient } = await import("../src/config/database.js");
  const prisma = getPrismaClient();
  const user = await prisma.user.update({
    where: { email: TEST_USER.email },
    data: { isEmailVerified: true },
  });
  console.log(`  ✅ User verified: ${user.id}`);

  // ── 3. Need a service ID for the seller and listing ──────────────────
  console.log("3. Checking for services...");
  const services = await prisma.service.findMany({ take: 1 });
  let serviceId: string;
  if (services.length === 0) {
    // Create a test service
    const hero = await prisma.hero.create({
      data: {
        title: "Test Hero",
        sub_title: "Test Subtitle",
      },
    });
    const service = await prisma.service.create({
      data: {
        name: "Test Service",
        title: "Test Service Title",
        details: "Test details",
        iconPublicId: "test",
        heroId: hero.id,
      },
    });
    serviceId = service.id;
    console.log(`  ✅ Created test service: ${service.id}`);
  } else {
    serviceId = services[0].id;
    console.log(`  ✅ Using existing service: ${serviceId}`);
  }

  // Update seller data with the service ID
  SELLER_DATA.servicesId = [serviceId];

  // ── 4. Login ─────────────────────────────────────────────────────────
  console.log("4. Logging in...");
  const loginRes = await fetch(`${BASE}/users/login-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });
  const loginBody = await loginRes.json();
  if (!loginRes.ok) {
    console.error("  ❌ Login failed:", loginBody);
    await prisma.$disconnect();
    return;
  }
  const token = loginBody.data.token.accessToken;
  console.log(`  ✅ Logged in, got token`);

  // ── 5. Try becoming a seller WITHOUT a subscription → expect 403 ─────
  // Becoming a seller requires an active paid subscription — a user
  // without one must be rejected with a clear message.
  console.log("5. Trying update-as-seller without a subscription (should fail)...");
  const noSubRes = await fetch(`${BASE}/users/update-as-seller`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(SELLER_DATA),
  });
  const noSubBody = await noSubRes.json();
  if (noSubRes.status === 403) {
    console.log(`  ✅ Got 403 as expected: "${noSubBody.message}"`);
  } else {
    console.error(
      `  ❌ Expected 403 but got ${noSubRes.status}: ${JSON.stringify(noSubBody)}`
    );
    await prisma.$disconnect();
    return;
  }

  // ── 6. Switch-role gates ─────────────────────────────────────────────
  // (a) A user flagged as a seller (e.g. after paying via Stripe) but with
  //     NO seller profile → switching in must be blocked with a friendly 400.
  console.log("6a. Simulating a seller flag with no seller profile (should be blocked)...");
  await prisma.user.update({
    where: { id: user.id },
    data: { isSeller: true },
  });
  const noProfileRes = await fetch(`${BASE}/users/switch-role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const noProfileBody = await noProfileRes.json();
  if (
    noProfileRes.status === 400 &&
    /seller profile/i.test(noProfileBody.message || "")
  ) {
    console.log(`  ✅ Got 400 as expected: "${noProfileBody.message}"`);
  } else {
    console.error(
      `  ❌ Expected 400 with a seller-profile message but got ${noProfileRes.status}: ${JSON.stringify(noProfileBody)}`
    );
    await prisma.$disconnect();
    return;
  }

  // (b) Seller profile set up but NO subscription → switch-role → 403.
  // We simulate the "legacy seller" state directly in the DB (isSeller +
  // sellerInfo are normally created by update-as-seller, which now
  // requires a plan).
  console.log("6b. Seller profile without a subscription (should get 403)...");
  const legacyInfo = await prisma.sellerInfo.create({
    data: {
      userId: user.id,
      storeName: "Legacy Test Store",
      servicesId: [serviceId],
      insuranceStatus: "yes",
      socialLInk: "https://example.com",
      businessNumber: "BUS-LEGACY-1",
      businessEmail: TEST_USER.email,
    },
  });
  await prisma.selleraddress.create({
    data: {
      sellerId: legacyInfo.id,
      streetAddress: "1 Legacy Way",
      city: "Test City",
      state: "TS",
      zipCode: "12345",
    },
  });
  const legacySwitchRes = await fetch(`${BASE}/users/switch-role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const legacySwitchBody = await legacySwitchRes.json();
  if (legacySwitchRes.status === 403) {
    console.log(`  ✅ Got 403 as expected: "${legacySwitchBody.message}"`);
  } else {
    console.error(
      `  ❌ Expected 403 but got ${legacySwitchRes.status}: ${JSON.stringify(legacySwitchBody)}`
    );
    await prisma.$disconnect();
    return;
  }
  // Reset isSeller so the update-as-seller step below still exercises the
  // "new seller with a subscription" path through the gate. (The sellerInfo
  // created above is simply updated by update-as-seller later.)
  await prisma.user.update({
    where: { id: user.id },
    data: { isSeller: false },
  });
  console.log("  ✅ Reset isSeller flag");

  // ── 7. Assign a paid plan BEFORE becoming a seller ───────────────────
  // Becoming a seller now requires an active paid subscription — assign
  // the Premium plan first so update-as-seller below passes the gate.
  console.log("7. Assigning a paid plan (required to become a seller)...");
  const premiumPlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: "premium" },
  });
  if (!premiumPlan) {
    console.error(
      "  ❌ Premium plan not found — run the plans seeder first (npm run seed:plans)"
    );
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
  console.log(`  ✅ Plan assigned to user: ${premiumPlan.name}`);

  // ── 8. Update as seller ──────────────────────────────────────────────
  console.log("8. Updating user as seller...");
  const sellerRes = await fetch(`${BASE}/users/update-as-seller`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(SELLER_DATA),
  });
  const sellerBody = await sellerRes.json();
  if (!sellerRes.ok) {
    console.error("  ❌ Update as seller failed:", sellerBody);
    await prisma.$disconnect();
    return;
  }
  // update-as-seller activates the seller role and returns fresh tokens.
  const sellerToken = sellerBody.data?.data?.accessToken;
  if (!sellerToken) {
    console.error(
      "  ❌ update-as-seller did not return seller tokens:",
      sellerBody
    );
    await prisma.$disconnect();
    return;
  }
  console.log(`  ✅ Seller activated (role: ${sellerBody.data?.data?.role})`);

  // ── 9. Switch-role round trip (positive case) ────────────────────────
  // With a completed profile + active subscription, switching OUT to the
  // user role and back INTO the seller role must both succeed (200) and
  // return fresh tokens carrying the updated role claim.
  console.log("9. Switching to the user role (should succeed)...");
  const switchOutRes = await fetch(`${BASE}/users/switch-role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({}),
  });
  const switchOutBody = await switchOutRes.json();
  const switchOutData = switchOutBody.data;
  if (switchOutRes.ok && switchOutData?.role === "user") {
    console.log(`  ✅ Switched to user role (role: ${switchOutData.role})`);
  } else {
    console.error(
      `  ❌ Switch to user role failed: ${JSON.stringify(switchOutBody)}`
    );
    await prisma.$disconnect();
    return;
  }
  const userToken = switchOutData.accessToken;

  console.log("9b. Switching back to the seller role (should succeed)...");
  const switchInRes = await fetch(`${BASE}/users/switch-role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({}),
  });
  const switchInBody = await switchInRes.json();
  const switchInData = switchInBody.data;
  if (switchInRes.ok && switchInData?.role === "seller") {
    console.log(
      `  ✅ Switched back to seller role (role: ${switchInData.role})`
    );
  } else {
    console.error(
      `  ❌ Switch back to seller role failed: ${JSON.stringify(switchInBody)}`
    );
    await prisma.$disconnect();
    return;
  }
  // Use the fresh seller token (role claim = seller) for the seller-only
  // calls below.
  const freshSellerToken = switchInData.accessToken;

  // ── 10. Get the addressId ────────────────────────────────────────────
  console.log("10. Fetching seller address ID...");
  const sellerInfo = await prisma.sellerInfo.findUnique({
    where: { userId: user.id },
    include: { sellerAddress: true },
  });
  if (!sellerInfo || sellerInfo.sellerAddress.length === 0) {
    console.error("  ❌ No seller address found");
    await prisma.$disconnect();
    return;
  }
  const addressId = sellerInfo.sellerAddress[0].id;
  console.log(`  ✅ Address ID: ${addressId}`);

  // ── 11. Create listing ───────────────────────────────────────────────
  console.log("11. Creating listing...");

  // Create FormData for the listing (multipart)
  const listingPayload = {
    title: "Professional Web Development Services",
    slug: `professional-web-dev-${Date.now()}`,
    serviceId: serviceId,
    description:
      "We build modern web applications using the latest technologies and best practices.",
    addressId: addressId,
    basePrice: "500",
    hourlyPrice: "50",
    dailyPrice: "200",
    isAvailable: "true",
  };

  const listingRes = await fetch(`${BASE}/listings/create-listing`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${freshSellerToken}`,
      // Note: Content-Type is multipart/form-data set by the boundary
    },
    body: (() => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(listingPayload)) {
        formData.append(key, value);
      }
      return formData;
    })(),
  });
  const listingBody = await listingRes.json();
  if (!listingRes.ok) {
    console.error("  ❌ Create listing failed:", JSON.stringify(listingBody, null, 2));
    await prisma.$disconnect();
    return;
  }
  console.log(`  ✅ Listing created! ID: ${listingBody.data?.data?.listingId}`);

  // ── 12. Verify the listing in DB ─────────────────────────────────────
  console.log("12. Verifying listing in database...");
  const listing = await prisma.listing.findUnique({
    where: { id: listingBody.data?.data?.listingId },
    select: {
      id: true,
      title: true,
      addressId: true,
      isAvailable: true,
    },
  });
  if (!listing) {
    console.error("  ❌ Listing not found in DB");
  } else {
    console.log(`  ✅ Listing verified:`);
    console.log(`     Title: ${listing.title}`);
    console.log(`     Address ID: ${listing.addressId}`);
    console.log(`     Available: ${listing.isAvailable}`);
  }

  await prisma.$disconnect();
  console.log("\n═══ Test Complete ═══");
}

main().catch(console.error);
