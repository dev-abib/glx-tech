/**
 * Integration test for the listing creation flow.
 *
 * Steps:
 *  1. Register a user
 *  2. Manually verify the user (set isEmailVerified in DB)
 *  3. Login to get tokens
 *  4. Update user as seller (creates SellerInfo + Selleraddress)
 *  5. Create a listing using the addressId from step 4
 *  6. Fetch the listing to verify lat/lng are present
 *
 * Run: npx tsx scripts/test-listing-flow.ts
 */

const BASE = "http://localhost:5000/api/v1";

const TEST_USER = {
  name: "Test Seller",
  email: `test-seller-${Date.now()}@example.com`,
  password: "Test@1234",
  confirmPassword: "Test@1234",
  phone: "+1234567890",
};

const SELLER_DATA = {
  storeName: "Test Store",
  servicesId: [] as string[],
  insuranceStatus: "yes" as const,
  socialLInk: "https://example.com",
  businessNumber: "BUS-12345",
  businessEmail: "test-seller@example.com",
  streetAddress: "1600 Amphitheatre Parkway",
  city: "Mountain View",
  state: "CA",
  zipCode: "94043",
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

  // ── 5. Update as seller ──────────────────────────────────────────────
  console.log("5. Updating user as seller...");
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
  console.log(`  ✅ Seller created`);

  // ── 6. Switch role to seller ─────────────────────────────────────────
  console.log("6. Switching role to seller...");
  const switchRes = await fetch(`${BASE}/users/switch-role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const switchBody = await switchRes.json();
  if (!switchRes.ok) {
    console.error("  ❌ Switch role failed:", switchBody);
    await prisma.$disconnect();
    return;
  }
  // Use the new token from the role switch
  const sellerToken = switchBody.data.accessToken;
  console.log(`  ✅ Role switched to seller`);

  // ── 7. Get the addressId ─────────────────────────────────────────────
  console.log("6. Fetching seller address ID...");
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

  // ── 8. Create listing ────────────────────────────────────────────────
  console.log("8. Creating listing...");

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
    estimatedDuration: "2 weeks",
    isAvailable: "true",
  };

  const listingRes = await fetch(`${BASE}/listings/create-listing`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sellerToken}`,
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

  // ── 9. Verify the listing in DB ──────────────────────────────────────
  console.log("9. Verifying listing in database...");
  const listing = await prisma.listing.findUnique({
    where: { id: listingBody.data?.data?.listingId },
    select: {
      id: true,
      title: true,
      addressId: true,
      latitude: true,
      longitude: true,
      isAvailable: true,
    },
  });
  if (!listing) {
    console.error("  ❌ Listing not found in DB");
  } else {
    console.log(`  ✅ Listing verified:`);
    console.log(`     Title: ${listing.title}`);
    console.log(`     Address ID: ${listing.addressId}`);
    console.log(`     Latitude: ${listing.latitude}`);
    console.log(`     Longitude: ${listing.longitude}`);
    console.log(`     Available: ${listing.isAvailable}`);
    console.log(`     Lat/Lng geocoded: ${listing.latitude}, ${listing.longitude}`);
  }

  await prisma.$disconnect();
  console.log("\n═══ Test Complete ═══");
}

main().catch(console.error);
