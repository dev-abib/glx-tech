import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Hoisted mock objects ────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest, so any variable
// referenced inside vi.mock must also be hoisted via vi.hoisted().

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    planFeature: { findUnique: vi.fn() },
    listing: { count: vi.fn() },
  },
}));

vi.mock("../../config/database.js", () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
}));

// ── SUT ──────────────────────────────────────────────────────────────────

import { SubscriptionService } from "./subscription.service.js";

describe("SubscriptionService — hasFeature", () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any cached values between tests
    subscriptionService = new SubscriptionService();
    subscriptionService.clearAllCache();
  });

  it("✅ should return TRUE when user has a subscription plan AND the feature is enabled", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
    });
    (mockPrisma.planFeature.findUnique as Mock).mockResolvedValue({
      enabled: true,
    });

    const result = await subscriptionService.hasFeature(
      "user-1",
      "multiple_locations"
    );

    expect(result).toBe(true);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { subscriptionPlanId: true },
    });
    expect(mockPrisma.planFeature.findUnique).toHaveBeenCalledWith({
      where: {
        planId_key: { planId: "plan-premium", key: "multiple_locations" },
      },
      select: { enabled: true },
    });
  });

  it("❌ should return FALSE when user has NO subscription plan (free user)", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: null,
    });

    const result = await subscriptionService.hasFeature(
      "user-2",
      "multiple_locations"
    );

    expect(result).toBe(false);
    // Should NOT query planFeature at all
    expect(mockPrisma.planFeature.findUnique).not.toHaveBeenCalled();
  });

  it("❌ should return FALSE when user does not exist", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue(null);

    const result = await subscriptionService.hasFeature(
      "nonexistent-user",
      "multiple_locations"
    );

    expect(result).toBe(false);
    expect(mockPrisma.planFeature.findUnique).not.toHaveBeenCalled();
  });

  it("❌ should return FALSE when planFeature record exists but is disabled", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-free",
    });
    (mockPrisma.planFeature.findUnique as Mock).mockResolvedValue({
      enabled: false,
    });

    const result = await subscriptionService.hasFeature(
      "user-3",
      "multiple_locations"
    );

    expect(result).toBe(false);
  });

  it("❌ should return FALSE when planFeature record does not exist", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
    });
    (mockPrisma.planFeature.findUnique as Mock).mockResolvedValue(null);

    const result = await subscriptionService.hasFeature(
      "user-1",
      "some_new_feature_not_in_db"
    );

    expect(result).toBe(false);
  });

  it("🧠 should return CACHED value on second call (no extra DB queries)", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
    });
    (mockPrisma.planFeature.findUnique as Mock).mockResolvedValue({
      enabled: true,
    });

    // First call — should hit DB
    const firstResult = await subscriptionService.hasFeature(
      "user-cache",
      "multiple_locations"
    );
    expect(firstResult).toBe(true);

    // Clear mock call history
    (mockPrisma.user.findUnique as Mock).mockClear();
    (mockPrisma.planFeature.findUnique as Mock).mockClear();

    // Second call — should NOT hit DB (uses cache)
    const secondResult = await subscriptionService.hasFeature(
      "user-cache",
      "multiple_locations"
    );
    expect(secondResult).toBe(true);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.planFeature.findUnique).not.toHaveBeenCalled();
  });

  it("🔄 should return UPDATED value after cache is invalidated", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: null,
    });

    // First call — returns false (no plan)
    const firstResult = await subscriptionService.hasFeature(
      "user-invalidate",
      "multiple_locations"
    );
    expect(firstResult).toBe(false);

    // Now the user gets a plan
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
    });
    (mockPrisma.planFeature.findUnique as Mock).mockResolvedValue({
      enabled: true,
    });

    // Invalidate cache
    subscriptionService.invalidateUserCache("user-invalidate");

    // Should now return true
    const secondResult = await subscriptionService.hasFeature(
      "user-invalidate",
      "multiple_locations"
    );
    expect(secondResult).toBe(true);
  });
});

describe("SubscriptionService — canCreateListing", () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionService = new SubscriptionService();
    subscriptionService.clearAllCache();
  });

  it("✅ should allow listing creation when count is below maxActiveListings", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
      subscriptionPlan: {
        id: "plan-premium",
        maxActiveListings: 50,
        maxFeaturedListings: 10,
        platformFeePercent: 0,
      },
    });
    (mockPrisma.listing.count as Mock).mockResolvedValue(5);

    const result = await subscriptionService.canCreateListing("user-1");

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(5);
    expect(result.maxAllowed).toBe(50);
  });

  it("❌ should REJECT listing creation when count reaches maxActiveListings", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
      subscriptionPlan: {
        id: "plan-premium",
        maxActiveListings: 50,
        maxFeaturedListings: 10,
        platformFeePercent: 0,
      },
    });
    (mockPrisma.listing.count as Mock).mockResolvedValue(50);

    const result = await subscriptionService.canCreateListing("user-1");

    expect(result.allowed).toBe(false);
    expect(result.currentCount).toBe(50);
    expect(result.maxAllowed).toBe(50);
  });

  it("✅ should allow 1 listing for free users (default limit)", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: null,
      subscriptionPlan: null,
    });
    (mockPrisma.listing.count as Mock).mockResolvedValue(0);

    const result = await subscriptionService.canCreateListing("user-free");

    expect(result.allowed).toBe(true);
    expect(result.maxAllowed).toBe(1); // Default for free users
  });

  it("❌ should reject 2nd listing for free users (default limit = 1)", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: null,
      subscriptionPlan: null,
    });
    (mockPrisma.listing.count as Mock).mockResolvedValue(1);

    const result = await subscriptionService.canCreateListing("user-free");

    expect(result.allowed).toBe(false);
    expect(result.maxAllowed).toBe(1);
    expect(result.currentCount).toBe(1);
  });
});

describe("SubscriptionService — canFeatureListing", () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionService = new SubscriptionService();
    subscriptionService.clearAllCache();
  });

  it("✅ should allow featuring when count is below maxFeaturedListings", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
      subscriptionPlan: {
        id: "plan-premium",
        maxActiveListings: 50,
        maxFeaturedListings: 10,
        platformFeePercent: 0,
      },
    });
    (mockPrisma.listing.count as Mock).mockResolvedValue(3);

    const result = await subscriptionService.canFeatureListing("user-1");

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(3);
    expect(result.maxAllowed).toBe(10);
  });

  it("❌ should reject featuring when count reaches maxFeaturedListings", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
      subscriptionPlan: {
        id: "plan-premium",
        maxActiveListings: 50,
        maxFeaturedListings: 10,
        platformFeePercent: 0,
      },
    });
    (mockPrisma.listing.count as Mock).mockResolvedValue(10);

    const result = await subscriptionService.canFeatureListing("user-1");

    expect(result.allowed).toBe(false);
    expect(result.currentCount).toBe(10);
    expect(result.maxAllowed).toBe(10);
  });

  it("❌ should reject featuring for free users (maxFeaturedListings = 0)", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: null,
      subscriptionPlan: null,
    });
    (mockPrisma.listing.count as Mock).mockResolvedValue(0);

    const result = await subscriptionService.canFeatureListing("user-free");

    expect(result.allowed).toBe(false);
    expect(result.maxAllowed).toBe(0);
  });

  it("🔄 -1 maxFeaturedListings means UNLIMITED", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-unlimited",
      subscriptionPlan: {
        id: "plan-unlimited",
        maxActiveListings: 999,
        maxFeaturedListings: -1,
        platformFeePercent: 0,
      },
    });
    (mockPrisma.listing.count as Mock).mockResolvedValue(999); // Even with tons of featured listings

    const result = await subscriptionService.canFeatureListing("user-unlimited");

    expect(result.allowed).toBe(true); // -1 means unlimited
    expect(result.maxAllowed).toBe(-1);
  });
});

describe("SubscriptionService — getPlatformFee", () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionService = new SubscriptionService();
    subscriptionService.clearAllCache();
  });

  it("should return plan's platform fee for subscribed users", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: "plan-premium",
      subscriptionPlan: {
        id: "plan-premium",
        maxActiveListings: 50,
        maxFeaturedListings: 10,
        platformFeePercent: 0,
      },
    });

    const fee = await subscriptionService.getPlatformFee("user-1");
    expect(fee).toBe(0);
  });

  it("should return default 5% fee for free users", async () => {
    (mockPrisma.user.findUnique as Mock).mockResolvedValue({
      subscriptionPlanId: null,
      subscriptionPlan: null,
    });

    const fee = await subscriptionService.getPlatformFee("user-free");
    expect(fee).toBe(5);
  });
});
