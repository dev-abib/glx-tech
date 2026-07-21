import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock objects ────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest, so any variable
// referenced inside vi.mock must also be hoisted via vi.hoisted().

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    planFeature: { findUnique: vi.fn() },
  },
}));

vi.mock("../../config/database.js", () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
}));

const { mockUserRepo } = vi.hoisted(() => ({
  mockUserRepo: {
    updateSellerDetails: vi.fn(),
    deleteSellerAddress: vi.fn(),
  },
}));

vi.mock("./user.repository.js", () => ({
  UserRepository: vi.fn().mockImplementation(function () {
    return mockUserRepo;
  }),
}));

// ── SUT ──────────────────────────────────────────────────────────────────

import { UserService } from "./user.service.js";

describe("UserService — updateSellerDetails", () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.user.findUnique = vi.fn();
    mockPrisma.planFeature.findUnique = vi.fn();
    mockUserRepo.updateSellerDetails = vi.fn();
    mockUserRepo.deleteSellerAddress = vi.fn();

    userService = new UserService();
  });

  // ── Premium user — can add addresses ───────────────────────────────────

  it("should call repo with canAddMultipleAddresses=true when user has the multiple_locations feature enabled", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionPlanId: "plan-premium",
    });
    mockPrisma.planFeature.findUnique.mockResolvedValue({ enabled: true });
    mockUserRepo.updateSellerDetails.mockResolvedValue({
      message: "Seller details updated successfully",
    });

    const data = {
      storeName: "Updated Store",
      addresses: [
        { streetAddress: "456 New St", city: "LA", state: "CA", zipCode: "90001" },
      ],
    };

    const result = await userService.updateSellerDetails("user-1", data);

    // Verify premium check was made
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

    // Verify repo was called with canAddMultipleAddresses=true
    expect(mockUserRepo.updateSellerDetails).toHaveBeenCalledWith(
      "user-1",
      data,
      true
    );

    expect(result).toEqual({ message: "Seller details updated successfully" });
  });

  // ── Free user — cannot add addresses ───────────────────────────────────

  it("should call repo with canAddMultipleAddresses=false when user has no subscription", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionPlanId: null,
    });
    // When subscriptionPlanId is null, hasFeature returns false without querying planFeature
    mockUserRepo.updateSellerDetails.mockResolvedValue({
      message: "Seller details updated successfully",
    });

    const data = { storeName: "Free Store" };

    const result = await userService.updateSellerDetails("user-2", data);

    // Verify planFeature was NOT queried (short-circuits for free users)
    expect(mockPrisma.planFeature.findUnique).not.toHaveBeenCalled();

    expect(mockUserRepo.updateSellerDetails).toHaveBeenCalledWith(
      "user-2",
      data,
      false
    );

    expect(result).toEqual({ message: "Seller details updated successfully" });
  });

  // ── Feature disabled on a paid plan ────────────────────────────────────

  it("should call repo with canAddMultipleAddresses=false when feature is disabled on a paid plan", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionPlanId: "plan-basic",
    });
    mockPrisma.planFeature.findUnique.mockResolvedValue({ enabled: false });
    mockUserRepo.updateSellerDetails.mockResolvedValue({
      message: "Seller details updated successfully",
    });

    const data = { businessEmail: "new@example.com" };

    const result = await userService.updateSellerDetails("user-3", data);

    expect(mockUserRepo.updateSellerDetails).toHaveBeenCalledWith(
      "user-3",
      data,
      false
    );

    expect(result).toEqual({ message: "Seller details updated successfully" });
  });

  // ── Feature row missing in DB ──────────────────────────────────────────

  it("should call repo with canAddMultipleAddresses=false when planFeature row does not exist", async () => {
    // User has a plan, but the feature definition row is missing from the DB
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionPlanId: "plan-old",
    });
    mockPrisma.planFeature.findUnique.mockResolvedValue(null);
    mockUserRepo.updateSellerDetails.mockResolvedValue({
      message: "Seller details updated successfully",
    });

    const data = { storeName: "Legacy Plan Store" };

    const result = await userService.updateSellerDetails("user-5", data);

    // Feature query was made but returned null — defaults to false
    expect(mockPrisma.planFeature.findUnique).toHaveBeenCalledWith({
      where: {
        planId_key: { planId: "plan-old", key: "multiple_locations" },
      },
      select: { enabled: true },
    });

    expect(mockUserRepo.updateSellerDetails).toHaveBeenCalledWith(
      "user-5",
      data,
      false
    );

    expect(result).toEqual({ message: "Seller details updated successfully" });
  });

  // ── Propagates repo errors ─────────────────────────────────────────────

  it("should propagate errors thrown by the repository", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionPlanId: null,
    });
    mockUserRepo.updateSellerDetails.mockRejectedValue(
      new Error("User is not a seller")
    );

    await expect(
      userService.updateSellerDetails("user-4", { storeName: "X" })
    ).rejects.toThrow("User is not a seller");
  });
});

// ── deleteSellerAddress ──────────────────────────────────────────────────

describe("UserService — deleteSellerAddress", () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepo.deleteSellerAddress = vi.fn();
    userService = new UserService();
  });

  it("should delegate to the repository with correct userId and addressId", async () => {
    mockUserRepo.deleteSellerAddress.mockResolvedValue({
      message: "Address deleted successfully",
    });

    const result = await userService.deleteSellerAddress(
      "user-1",
      "addr-uuid-123"
    );

    expect(mockUserRepo.deleteSellerAddress).toHaveBeenCalledWith(
      "user-1",
      "addr-uuid-123"
    );
    expect(result).toEqual({ message: "Address deleted successfully" });
  });

  it("should propagate repository errors", async () => {
    mockUserRepo.deleteSellerAddress.mockRejectedValue(
      new Error("Address not found")
    );

    await expect(
      userService.deleteSellerAddress("user-1", "nonexistent-id")
    ).rejects.toThrow("Address not found");
  });
});
