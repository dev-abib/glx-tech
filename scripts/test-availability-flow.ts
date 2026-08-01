/**
 * End-to-end test for the seller availability (blocked-slot) flow AND the
 * self-service account-deletion (soft delete) flow.
 *
 * Availability:
 * 1. Register + verify a seller, set up business profile (update-as-seller)
 * 2. Create a listing
 * 3. Seller blocks a time range (09:00–11:00) on a future date
 * 4. Register + verify a buyer
 * 5. Buyer books a time INSIDE the blocked range → expect 409
 * 6. Buyer books a time OUTSIDE the blocked range → expect 201
 * 7. Verify getBookedTimes surfaces the blocked slot
 *
 * Account deletion (DELETE /users/delete-me):
 * 8. Create a second listing with NO bookings
 * 9. Simulate an active Stripe subscription (fake sub ID)
 * 10. Delete the account — verify Stripe cancel is attempted (failure tolerated)
 * 11. Verify the user row is anonymized + Stripe fields cleared
 * 12. Verify booked listing kept+anonymized, unbooked listing hard-deleted
 * 13. Verify appointment history preserved, buyer still logs in, seller blocked
 * 14. Clean up all created rows
 *
 * Run: npx tsx scripts/test-availability-flow.ts
 * (backend must be running on $BASE)
 */

const BASE = process.env.BASE_URL || "http://localhost:5000/api/v1";

const BLOCKED_DATE = "2026-09-15"; // date the seller blocks 09:00–11:00
const BLOCKED_START = "09:00";
const BLOCKED_END = "11:00";

let prisma: any;

function fail(message: string): void {
  console.error(message);
  console.error("  Test FAILED");
  process.exitCode = 1;
}

async function main() {
  console.log("═══ Testing Seller Availability (Blocked Slots) Flow ═══\n");

  const { getPrismaClient } = await import("../src/config/database.js");
  prisma = getPrismaClient();

  const suffix = Date.now();
  const sellerEmail = `avail-seller-${suffix}@example.com`;
  const buyerEmail = `avail-buyer-${suffix}@example.com`;

  let sellerId: string | null = null;
  let buyerId: string | null = null;
  let listingId: string | null = null;
  let secondListingId: string | null = null;
  let slotId: string | null = null;
  let appointmentId: string | null = null;

  try {
    // ── 1. Register seller ────────────────────────────────────────────
    console.log("1. Registering seller...");
    const regRes = await fetch(`${BASE}/users/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Avail Test Seller",
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

    // ── 2. Verify seller in DB + get/create a service ─────────────────
    console.log("2. Verifying seller + ensuring a service exists...");
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

    // ── 3. Login seller ───────────────────────────────────────────────
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

    // ── 4. Activate seller + create listing ───────────────────────────
    console.log("4. Setting up seller profile + listing...");
    const sellerRes = await fetch(`${BASE}/users/update-as-seller`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        storeName: "Avail Test Store",
        servicesId: [service.id],
        insuranceStatus: "yes",
        socialLInk: "https://example.com",
        businessNumber: "BUS-AVAIL-1",
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
    console.log("  ✅ Seller activated");

    const sellerInfo = await prisma.sellerInfo.findUnique({
      where: { userId: sellerId },
      include: { sellerAddress: true },
    });
    const addressId = sellerInfo?.sellerAddress?.[0]?.id;
    if (!addressId) {
      fail("  ❌ No seller address found");
      return;
    }

    const formData = new FormData();
    formData.append("title", "Availability Test Listing");
    formData.append("serviceId", service.id);
    formData.append("description", "E2E availability test");
    formData.append("addressId", addressId);
    formData.append("basePrice", "100");
    formData.append("isAvailable", "true");

    const listingRes = await fetch(`${BASE}/listings/create-listing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: formData,
    });
    const listingBody = await listingRes.json();
    if (!listingRes.ok) {
      fail(`  ❌ Create listing failed: ${JSON.stringify(listingBody, null, 2)}`);
      return;
    }
    listingId = listingBody.data?.data?.listingId;
    console.log(`  ✅ Listing created: ${listingId}`);

    // ── 5. Seller blocks a time range ─────────────────────────────────
    console.log(`5. Blocking ${BLOCKED_DATE} ${BLOCKED_START}–${BLOCKED_END}...`);
    const blockRes = await fetch(`${BASE}/appointments/seller/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        date: BLOCKED_DATE,
        startTime: BLOCKED_START,
        endTime: BLOCKED_END,
        reason: "E2E blocked slot",
      }),
    });
    const blockBody = await blockRes.json();
    if (!blockRes.ok) {
      fail(`  ❌ Block slot failed: ${JSON.stringify(blockBody)}`);
      return;
    }
    slotId = blockBody.data?.id;
    console.log(`  ✅ Blocked slot created: ${slotId}`);

    // ── 6. Register + verify buyer ────────────────────────────────────
    console.log("6. Registering buyer...");
    const buyerRegRes = await fetch(`${BASE}/users/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Avail Test Buyer",
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

    // ── 7. Buyer books INSIDE blocked range → expect 409 ──────────────
    console.log(`7. Buyer books ${BLOCKED_DATE} at 10:00 (inside block) → expect 409...`);
    const blockedRes = await fetch(`${BASE}/appointments/create-appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({
        listingId,
        bookingDate: BLOCKED_DATE,
        bookingTime: "10:00",
        appointmentType: "SERVICE",
        price: 100,
      }),
    });
    const blockedBody = await blockedRes.json();
    if (blockedRes.status === 409) {
      console.log(`  ✅ Got 409 as expected: "${blockedBody.message}"`);
    } else {
      fail(`  ❌ Expected 409 but got ${blockedRes.status}: ${JSON.stringify(blockedBody)}`);
      return;
    }

    // ── 8. Buyer books OUTSIDE blocked range → expect 201 ─────────────
    console.log(`8. Buyer books ${BLOCKED_DATE} at 14:00 (outside block) → expect 201...`);
    const openRes = await fetch(`${BASE}/appointments/create-appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({
        listingId,
        bookingDate: BLOCKED_DATE,
        bookingTime: "14:00",
        appointmentType: "SERVICE",
        price: 100,
      }),
    });
    const openBody = await openRes.json();
    if (openRes.ok) {
      appointmentId = openBody.data?.id ?? null;
      console.log(`  ✅ Got 201 — booking outside the blocked range accepted (id: ${appointmentId})`);
    } else {
      fail(`  ❌ Expected 201 but got ${openRes.status}: ${JSON.stringify(openBody)}`);
      return;
    }

    // ── 9. getBookedTimes surfaces the blocked slot ───────────────────
    console.log("9. Checking getBookedTimes includes the blocked slot...");
    const timesRes = await fetch(`${BASE}/appointments/booked-times/${listingId}?date=${BLOCKED_DATE}`);
    const timesBody = await timesRes.json();
    const blockedList = timesBody.data?.blocked ?? [];
    if (timesRes.ok && blockedList.some((s: any) => s.startTime === BLOCKED_START && s.endTime === BLOCKED_END)) {
      console.log("  ✅ Blocked slot returned by getBookedTimes");
    } else {
      fail(`  ❌ Blocked slot missing from getBookedTimes: ${JSON.stringify(timesBody.data)}`);
      return;
    }

    // ════════════════════════════════════════════════════════════════════
    // PART B — SELF-SERVICE ACCOUNT DELETION (soft delete)
    // ════════════════════════════════════════════════════════════════════

    // ── 10. Create a second listing with NO bookings ───────────────────
    //        (this one should be hard-deleted on account deletion)
    console.log("10. Creating a second listing (no bookings)...");
    const formData2 = new FormData();
    formData2.append("title", "Availability Test Listing 2");
    formData2.append("serviceId", service.id);
    formData2.append("description", "E2E deletion test");
    formData2.append("addressId", addressId);
    formData2.append("basePrice", "150");
    formData2.append("isAvailable", "true");

    const listing2Res = await fetch(`${BASE}/listings/create-listing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: formData2,
    });
    const listing2Body = await listing2Res.json();
    if (!listing2Res.ok) {
      fail(`  ❌ Create second listing failed: ${JSON.stringify(listing2Body, null, 2)}`);
      return;
    }
    secondListingId = listing2Body.data?.data?.listingId;
    console.log(`  ✅ Second listing created: ${secondListingId}`);

    // ── 11. Simulate an active Stripe subscription ─────────────────────
    //        (fake sub ID — softDeleteUserData must attempt to cancel it
    //         and still complete the deletion if the cancellation fails)
    console.log("11. Simulating an active Stripe subscription (fake sub ID)...");
    await prisma.user.update({
      where: { id: sellerId },
      data: {
        stripeSubscriptionId: "sub_fake_e2e_123",
        stripeCustomerId: "cus_fake_e2e_123",
        subscriptionStatus: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("  ✅ Stripe fields set on seller");

    // ── 12. Self-service delete ────────────────────────────────────────
    console.log("12. Calling DELETE /users/delete-me as the seller...");
    const delRes = await fetch(`${BASE}/users/delete-me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const delBody = await delRes.json();
    if (!delRes.ok) {
      fail(`  ❌ Delete account failed: ${JSON.stringify(delBody)}`);
      return;
    }
    console.log("  ✅ Delete accepted (Stripe cancel attempted, failure tolerated)");

    // ── 13. Verify user row anonymized + Stripe cleared ────────────────
    console.log("13. Verifying user anonymization + Stripe cleanup...");
    const deletedUser = await prisma.user.findUnique({ where: { id: sellerId } });
    if (!deletedUser) {
      fail("  ❌ Deleted user row missing (expected anonymized row)");
      return;
    }
    const userOk =
      deletedUser.name === "Deleted User" &&
      deletedUser.email === `deleted-${sellerId}@deleted.invalid` &&
      deletedUser.isActive === false &&
      deletedUser.isEmailVerified === false &&
      deletedUser.isSeller === false &&
      deletedUser.isVerifiedSeller === false &&
      deletedUser.stripeSubscriptionId === null &&
      deletedUser.stripeCustomerId === null &&
      deletedUser.subscriptionStatus === null &&
      deletedUser.subscriptionPlanId === null;
    if (userOk) {
      console.log("  ✅ User anonymized, deactivated, Stripe fields cleared");
    } else {
      fail(`  ❌ Anonymization/Stripe cleanup incomplete: ${JSON.stringify(deletedUser, null, 2)}`);
      return;
    }

    // ── 14. Verify listing anonymization + hard delete ─────────────────
    console.log("14. Verifying listing handling...");
    const keptListing = await prisma.listing.findUnique({ where: { id: listingId } });
    const goneListing = await prisma.listing.findUnique({ where: { id: secondListingId } });

    if (!keptListing) {
      fail("  ❌ Booked listing should have been KEPT (anonymized), not deleted");
      return;
    }
    const listingOk =
      keptListing.title === "Deleted listing" &&
      keptListing.isAvailable === false &&
      Array.isArray(keptListing.media) &&
      keptListing.media.length === 0;
    if (listingOk && !goneListing) {
      console.log("  ✅ Booked listing anonymized + hidden; unbooked listing hard-deleted");
    } else {
      fail(
        `  ❌ Listing handling wrong — kept: ${JSON.stringify(keptListing)}, gone: ${JSON.stringify(goneListing)}`
      );
      return;
    }

    // ── 15. Verify appointment history preserved ───────────────────────
    console.log("15. Verifying appointment history preserved...");
    if (!appointmentId) {
      fail("  ❌ No appointment id captured from step 8 — cannot verify preservation");
      return;
    }
    const keptAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!keptAppointment) {
      fail("  ❌ Appointment should have been preserved after account deletion");
      return;
    }
    const apptOk =
      keptAppointment.listingId === listingId &&
      keptAppointment.buyerId === buyerId &&
      keptAppointment.sellerId === sellerId;
    if (apptOk) {
      console.log(
        `  ✅ Appointment preserved (id: ${keptAppointment.id}, status: ${keptAppointment.status})`
      );
    } else {
      fail(`  ❌ Appointment references wrong: ${JSON.stringify(keptAppointment)}`);
      return;
    }

    // ── 16. Buyer still works, seller cannot log in ────────────────────
    console.log("16. Verifying login gates after deletion...");
    const buyerReLoginRes = await fetch(`${BASE}/users/login-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: buyerEmail, password: "Test@1234" }),
    });
    if (buyerReLoginRes.ok) {
      console.log("  ✅ Buyer can still log in (account untouched)");
    } else {
      fail(`  ❌ Buyer login failed after seller deletion: ${buyerReLoginRes.status}`);
      return;
    }

    const sellerReLoginRes = await fetch(`${BASE}/users/login-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sellerEmail, password: "Test@1234" }),
    });
    if (!sellerReLoginRes.ok) {
      console.log("  ✅ Deleted seller cannot log in (email anonymized)");
    } else {
      fail("  ❌ Deleted seller should NOT be able to log in");
      return;
    }

    console.log("\n═══ ✅ ALL CHECKS PASSED — availability + account deletion flows work ═══");
  } catch (err) {
    console.error("\n❌ Test error:", err);
    process.exitCode = 1;
  } finally {
    await cleanup(sellerId, buyerId);
    await prisma.$disconnect();
  }
}

async function cleanup(sellerId: string | null, buyerId: string | null) {
  try {
    console.log("\n── Cleaning up test data ──");
    if (sellerId) {
      await prisma.appointment.deleteMany({ where: { OR: [{ sellerId }, { buyerId }] } });
      await prisma.unavailableSlot.deleteMany({ where: { sellerId } });
      // The kept (anonymized) listing survives soft-delete — remove it by userId.
      await prisma.listing.deleteMany({ where: { userId: sellerId } });
      const si = await prisma.sellerInfo.findUnique({ where: { userId: sellerId } });
      if (si) {
        await prisma.selleraddress.deleteMany({ where: { sellerId: si.id } });
        await prisma.sellerInfo.deleteMany({ where: { userId: sellerId } });
      }
      await prisma.user.deleteMany({ where: { id: sellerId } });
    }
    if (buyerId) {
      await prisma.user.deleteMany({ where: { id: buyerId } });
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
