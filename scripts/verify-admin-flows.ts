/**
 * End-to-end verification of the admin flows added during the QA close-out:
 *
 *  1. Admin appointments — ?search= and ?status= filtering
 *  2. Admin delete listing — 409 guard when the listing still has bookings
 *     (and a clean 200 delete for an unbooked listing)
 *  3. Admin delete review — 200 + row removed
 *  4. Lapsed seller (subscription canceled / no plan) gets 403 on listing update
 *
 * Run: npx tsx scripts/verify-admin-flows.ts
 * (backend must be running on $BASE)
 */

const BASE = process.env.BASE_URL || "http://localhost:5000/api/v1";

const BOOKING_DATE = "2026-09-15"; // future date for the test booking

let prisma: any;

function fail(message: string): void {
  console.error(message);
  console.error("  Test FAILED");
  process.exitCode = 1;
}

async function main() {
  console.log("═══ Verifying New Admin Flows (E2E) ═══\n");

  const { getPrismaClient } = await import("../src/config/database.js");
  prisma = getPrismaClient();

  const suffix = Date.now();
  const sellerEmail = `qa-seller-${suffix}@example.com`;
  const buyerEmail = `qa-buyer-${suffix}@example.com`;
  const lapsedEmail = `qa-lapsed-${suffix}@example.com`;

  let sellerId: string | null = null;
  let buyerId: string | null = null;
  let lapsedId: string | null = null;
  let listingAId: string | null = null;
  let listingBId: string | null = null;
  let lapsedListingId: string | null = null;
  let reviewId: string | null = null;
  let appointmentId: string | null = null;

  try {
    // ── 1. Register seller ────────────────────────────────────────────────
    console.log("1. Registering seller...");
    const regRes = await fetch(`${BASE}/users/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "QA Admin Seller",
        email: sellerEmail,
        password: "Test@1234",
        confirmPassword: "Test@1234",
      }),
    });
    const regBody = await regRes.json();
    if (!regRes.ok) {
      fail(`  ❌ Registration failed: ${JSON.stringify(regBody)}`);
      return;
    }
    console.log(`  ✅ Registered seller: ${sellerEmail}`);

    // ── 2. Verify email + ensure a service exists ─────────────────────────
    console.log("2. Verifying seller email + ensuring a service exists...");
    const seller = await prisma.user.update({
      where: { email: sellerEmail },
      data: { isEmailVerified: true },
    });
    sellerId = seller.id;

    let service = await prisma.service.findFirst();
    if (!service) {
      const hero = await prisma.hero.create({
        data: { title: "Test Hero", sub_title: "Test Sub" },
      });
      service = await prisma.service.create({
        data: {
          name: "Test Service",
          title: "Test Title",
          details: "Details",
          iconPublicId: "test",
          heroId: hero.id,
        },
      });
    }
    console.log(`  ✅ Seller verified (${sellerId}) — service ${service.id}`);

    // ── 3. Login seller ───────────────────────────────────────────────────
    console.log("3. Logging in seller...");
    const loginRes = await fetch(`${BASE}/users/login-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sellerEmail, password: "Test@1234" }),
    });
    const loginBody = await loginRes.json();
    if (!loginRes.ok) {
      fail(`  ❌ Seller login failed: ${JSON.stringify(loginBody)}`);
      return;
    }
    const token = loginBody.data.token.accessToken;

    // ── 4. Activate seller (free plan) + create listings ──────────────────
    console.log("4. Setting up seller profile...");
    const sellerRes = await fetch(`${BASE}/users/update-as-seller`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        storeName: "QA Admin Store",
        servicesId: [service.id],
        insuranceStatus: "yes",
        socialLInk: "https://example.com",
        businessNumber: "BUS-QA-1",
        businessEmail: sellerEmail,
        addresses: [{ streetAddress: "123 Test St", city: "Test City", state: "TS", zipCode: "12345" }],
      }),
    });
    const sellerBody = await sellerRes.json();
    const sellerToken = sellerBody.data?.data?.accessToken;
    if (!sellerRes.ok || !sellerToken) {
      fail(`  ❌ update-as-seller failed: ${JSON.stringify(sellerBody)}`);
      return;
    }
    console.log("  ✅ Seller activated (free plan assigned)");

    const sellerInfo = await prisma.sellerInfo.findUnique({
      where: { userId: sellerId },
      include: { sellerAddress: true },
    });
    const addressId = sellerInfo?.sellerAddress?.[0]?.id;
    if (!addressId) {
      fail("  ❌ No seller address found");
      return;
    }

    const titleA = `QA Admin Listing A ${suffix}`;
    const formDataA = new FormData();
    formDataA.append("title", titleA);
    formDataA.append("serviceId", service.id);
    formDataA.append("description", "E2E admin flow test");
    formDataA.append("addressId", addressId);
    formDataA.append("basePrice", "100");
    formDataA.append("isAvailable", "true");

    const listingARes = await fetch(`${BASE}/listings/create-listing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: formDataA,
    });
    const listingABody = await listingARes.json();
    if (!listingARes.ok) {
      fail(`  ❌ Create listing A failed: ${JSON.stringify(listingABody, null, 2)}`);
      return;
    }
    listingAId = listingABody.data?.data?.listingId;
    console.log(`  ✅ Listing A created (will hold a booking): ${listingAId}`);

    // ── 5. Register + verify buyer ────────────────────────────────────────
    console.log("5. Registering buyer...");
    const buyerRegRes = await fetch(`${BASE}/users/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "QA Admin Buyer",
        email: buyerEmail,
        password: "Test@1234",
        confirmPassword: "Test@1234",
      }),
    });
    const buyerRegBody = await buyerRegRes.json();
    if (!buyerRegRes.ok) {
      fail(`  ❌ Buyer registration failed: ${JSON.stringify(buyerRegBody)}`);
      return;
    }
    const buyer = await prisma.user.update({
      where: { email: buyerEmail },
      data: { isEmailVerified: true },
    });
    buyerId = buyer.id;

    const buyerLoginRes = await fetch(`${BASE}/users/login-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: buyerEmail, password: "Test@1234" }),
    });
    const buyerLoginBody = await buyerLoginRes.json();
    if (!buyerLoginRes.ok) {
      fail(`  ❌ Buyer login failed: ${JSON.stringify(buyerLoginBody)}`);
      return;
    }
    const buyerToken = buyerLoginBody.data.token.accessToken;
    console.log("  ✅ Buyer ready");

    // ── 6. Buyer books listing A (so it has bookings) ─────────────────────
    console.log(`6. Buyer books listing A on ${BOOKING_DATE}...`);
    const bookingRes = await fetch(`${BASE}/appointments/create-appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({
        listingId: listingAId,
        bookingDate: BOOKING_DATE,
        bookingTime: "10:00",
        appointmentType: "SERVICE",
        price: 100,
      }),
    });
    const bookingBody = await bookingRes.json();
    if (!bookingRes.ok) {
      fail(`  ❌ Booking failed: ${JSON.stringify(bookingBody)}`);
      return;
    }
    appointmentId = bookingBody.data?.id ?? null;
    console.log(`  ✅ Appointment created: ${appointmentId}`);

    // ── 7. Buyer reviews listing A ────────────────────────────────────────
    console.log("7. Buyer reviews listing A...");
    const reviewRes = await fetch(`${BASE}/listings/listing/${listingAId}/create-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({ rating: 5, review: "QA E2E review — great service" }),
    });
    const reviewBody = await reviewRes.json();
    if (!reviewRes.ok) {
      fail(`  ❌ Review creation failed: ${JSON.stringify(reviewBody)}`);
      return;
    }
    reviewId = reviewBody.data?.id ?? null;
    console.log(`  ✅ Review created: ${reviewId}`);

    // ── 8. Admin login ────────────────────────────────────────────────────
    console.log("8. Logging in as admin...");
    const adminRes = await fetch(`${BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@admin.com", password: "12345678" }),
    });
    const adminBody = await adminRes.json();
    if (!adminRes.ok) {
      fail(`  ❌ Admin login failed: ${JSON.stringify(adminBody)} — run the super-admin seeder first`);
      return;
    }
    const adminToken = adminBody.data.accessToken;
    console.log("  ✅ Admin logged in");

    // ── 9. Admin appointments search + status filter ──────────────────────
    console.log("9. Verifying admin appointments search + status filter...");

    // 9a. status=pending must include our booking (scoped by search so the
    //     assertion is deterministic even on a shared dev DB)
    const pendingRes = await fetch(
      `${BASE}/admin/appointments?status=pending&search=${encodeURIComponent(buyerEmail.slice(0, 12))}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const pendingBody = await pendingRes.json();
    const pendingIds = (pendingBody.data?.appointments ?? []).map((a: any) => a.id);
    if (pendingRes.ok && pendingIds.includes(appointmentId)) {
      console.log("  ✅ ?status=pending includes our booking");
    } else {
      fail(`  ❌ status=pending filter missing our booking: ${JSON.stringify(pendingBody.data)}`);
      return;
    }

    // 9b. status=cancelled must NOT include our booking (same scoped search)
    const cancelledRes = await fetch(
      `${BASE}/admin/appointments?status=cancelled&search=${encodeURIComponent(buyerEmail.slice(0, 12))}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const cancelledBody = await cancelledRes.json();
    const cancelledIds = (cancelledBody.data?.appointments ?? []).map((a: any) => a.id);
    if (cancelledRes.ok && !cancelledIds.includes(appointmentId)) {
      console.log("  ✅ ?status=cancelled excludes our booking");
    } else {
      fail(`  ❌ status=cancelled wrongly includes our booking`);
      return;
    }

    // 9c. search by listing title fragment
    const searchTitle = titleA.slice(0, 20);
    const searchRes = await fetch(
      `${BASE}/admin/appointments?search=${encodeURIComponent(searchTitle)}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const searchBody = await searchRes.json();
    const searchIds = (searchBody.data?.appointments ?? []).map((a: any) => a.id);
    if (searchRes.ok && searchIds.includes(appointmentId)) {
      console.log("  ✅ ?search=<listing title> finds our booking");
    } else {
      fail(`  ❌ search-by-title did not find our booking: ${JSON.stringify(searchBody.data)}`);
      return;
    }

    // 9d. search by buyer email fragment
    const searchBuyer = await fetch(
      `${BASE}/admin/appointments?search=${encodeURIComponent(buyerEmail.slice(0, 12))}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const searchBuyerBody = await searchBuyer.json();
    const searchBuyerIds = (searchBuyerBody.data?.appointments ?? []).map((a: any) => a.id);
    if (searchBuyer.ok && searchBuyerIds.includes(appointmentId)) {
      console.log("  ✅ ?search=<buyer email> finds our booking");
    } else {
      fail(
        `  ❌ search-by-buyer-email did not find our booking ` +
        `(status=${searchBuyer.status}, term=${buyerEmail.slice(0, 12)}, ` +
        `ids=${JSON.stringify(searchBuyerIds)}, appointmentId=${appointmentId})`
      );
      return;
    }

    // ── 10. Admin delete listing A → expect 409 (has bookings) ────────────
    console.log("10. Admin delete listing A (has bookings) → expect 409...");
    const delA = await fetch(`${BASE}/admin/listings/${listingAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delABody = await delA.json();
    if (delA.status === 409) {
      console.log(`  ✅ Got 409 as expected: "${delABody.message}"`);
    } else {
      fail(`  ❌ Expected 409 but got ${delA.status}: ${JSON.stringify(delABody)}`);
      return;
    }
    // Listing A must still exist in the DB
    const stillThere = await prisma.listing.findUnique({ where: { id: listingAId } });
    if (stillThere) {
      console.log("  ✅ Listing A preserved (not deleted)");
    } else {
      fail("  ❌ Listing A was deleted despite having bookings");
      return;
    }

    // ── 11. Create unbooked listing B + admin delete → 200 ────────────────
    console.log("11. Creating unbooked listing B + admin delete → expect 200...");
    const formDataB = new FormData();
    formDataB.append("title", `QA Admin Listing B ${suffix}`);
    formDataB.append("serviceId", service.id);
    formDataB.append("description", "E2E admin delete test");
    formDataB.append("addressId", addressId);
    formDataB.append("basePrice", "200");
    formDataB.append("isAvailable", "true");

    const listingBRes = await fetch(`${BASE}/listings/create-listing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: formDataB,
    });
    const listingBBody = await listingBRes.json();
    if (!listingBRes.ok) {
      fail(`  ❌ Create listing B failed: ${JSON.stringify(listingBBody)}`);
      return;
    }
    listingBId = listingBBody.data?.data?.listingId;

    const delB = await fetch(`${BASE}/admin/listings/${listingBId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delBBody = await delB.json();
    if (delB.ok) {
      console.log(`  ✅ Unbooked listing deleted: "${delBBody.message}"`);
    } else {
      fail(`  ❌ Expected 200 but got ${delB.status}: ${JSON.stringify(delBBody)}`);
      return;
    }
    const goneB = await prisma.listing.findUnique({ where: { id: listingBId } });
    if (!goneB) {
      console.log("  ✅ Listing B row removed from DB");
    } else {
      fail("  ❌ Listing B still present in DB after delete");
      return;
    }

    // ── 12. Admin delete review → 200 ─────────────────────────────────────
    console.log("12. Admin delete review → expect 200...");
    const delReview = await fetch(`${BASE}/admin/reviews/${reviewId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delReviewBody = await delReview.json();
    if (delReview.ok) {
      console.log(`  ✅ Review deleted: "${delReviewBody.message}"`);
    } else {
      fail(`  ❌ Review delete failed: ${delReview.status} ${JSON.stringify(delReviewBody)}`);
      return;
    }
    const goneReview = await prisma.userReview.findUnique({ where: { id: reviewId } });
    if (!goneReview) {
      console.log("  ✅ Review row removed from DB");
    } else {
      fail("  ❌ Review still present in DB after delete");
      return;
    }

    // ── 13. Lapsed seller gets 403 on listing update ──────────────────────
    console.log("13. Verifying lapsed seller is blocked from updating a listing...");

    // Create a seller via the API, then lapse them directly in the DB:
    // role=seller, no plan, subscriptionStatus=canceled. They are NOT a
    // legacy seller (legacy = isSeller && no status), so membership is gone.
    const lapsedReg = await fetch(`${BASE}/users/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "QA Lapsed Seller",
        email: lapsedEmail,
        password: "Test@1234",
        confirmPassword: "Test@1234",
      }),
    });
    if (!lapsedReg.ok) {
      fail("  ❌ Lapsed seller registration failed");
      return;
    }
    const lapsedUser = await prisma.user.update({
      where: { email: lapsedEmail },
      data: {
        isEmailVerified: true,
        role: "seller",
        isSeller: true,
        subscriptionStatus: "canceled",
        subscriptionPlanId: null,
      },
    });
    lapsedId = lapsedUser.id;

    // Give the lapsed seller a listing directly (they cannot create one via
    // the API without a membership, which is exactly the point).
    const lapsedInfo = await prisma.sellerInfo.create({
      data: {
        userId: lapsedId,
        storeName: "QA Lapsed Store",
        servicesId: [service.id],
        insuranceStatus: "yes",
        socialLInk: "https://example.com",
        businessNumber: "BUS-LAPSED-1",
        businessEmail: lapsedEmail,
      },
    });
    const lapsedAddress = await prisma.selleraddress.create({
      data: {
        sellerId: lapsedInfo.id,
        streetAddress: "456 Lapsed St",
        city: "Test City",
        state: "TS",
        zipCode: "67890",
      },
    });
    const lapsedListing = await prisma.listing.create({
      data: {
        userId: lapsedId,
        title: `QA Lapsed Listing ${suffix}`,
        slug: `qa-lapsed-listing-${suffix}`,
        serviceId: service.id,
        description: "Lapsed seller test",
        addressId: lapsedAddress.id,
        media: [],
        basePrice: "99",
        isAvailable: true,
      },
    });
    lapsedListingId = lapsedListing.id;

    // Login — the token must carry the seller role (auth middleware).
    const lapsedLogin = await fetch(`${BASE}/users/login-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lapsedEmail, password: "Test@1234" }),
    });
    const lapsedLoginBody = await lapsedLogin.json();
    if (!lapsedLogin.ok) {
      fail(`  ❌ Lapsed seller login failed: ${JSON.stringify(lapsedLoginBody)}`);
      return;
    }
    const lapsedToken = lapsedLoginBody.data.token.accessToken;

    // Attempt to update the listing → must be 403 (membership inactive)
    const updForm = new FormData();
    updForm.append("title", `QA Lapsed Listing Renamed ${suffix}`);
    const updRes = await fetch(`${BASE}/listings/update-listing/${lapsedListingId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${lapsedToken}` },
      body: updForm,
    });
    const updBody = await updRes.json();
    if (updRes.status === 403) {
      console.log(`  ✅ Lapsed seller got 403 as expected: "${updBody.message}"`);
    } else {
      fail(`  ❌ Expected 403 for lapsed seller but got ${updRes.status}: ${JSON.stringify(updBody)}`);
      return;
    }

    console.log("\n═══ ✅ ALL ADMIN FLOW CHECKS PASSED ═══");
  } catch (err) {
    console.error("\n❌ Test error:", err);
    process.exitCode = 1;
  } finally {
    await cleanup(sellerId, buyerId, lapsedId);
    await prisma.$disconnect();
  }
}

async function cleanup(
  sellerId: string | null,
  buyerId: string | null,
  lapsedId: string | null
) {
  try {
    console.log("\n── Cleaning up test data ──");
    for (const id of [sellerId, buyerId, lapsedId]) {
      if (!id) continue;
      await prisma.appointment.deleteMany({
        where: { OR: [{ sellerId: id }, { buyerId: id }] },
      });
      await prisma.unavailableSlot.deleteMany({ where: { sellerId: id } });
      // Remove reviews written BY this user AND reviews that sit on this
      // user's listings (a buyer's review of a seller's listing is owned by
      // the buyer, so the FK-safe order is reviews -> listings).
      await prisma.userReview.deleteMany({
        where: { OR: [{ userId: id }, { listing: { userId: id } }] },
      });
      await prisma.listing.deleteMany({ where: { userId: id } });
      const si = await prisma.sellerInfo.findUnique({ where: { userId: id } });
      if (si) {
        await prisma.selleraddress.deleteMany({ where: { sellerId: si.id } });
        await prisma.sellerInfo.deleteMany({ where: { userId: id } });
      }
      await prisma.user.deleteMany({ where: { id } });
    }
    console.log("  ✅ Cleanup complete");
  } catch (err) {
    console.warn("  ⚠️  Cleanup warning:", err instanceof Error ? err.message : err);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
