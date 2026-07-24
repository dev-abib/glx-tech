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
    getSellerAddresses: vi.fn(),
    createSellerAddress: vi.fn(),
    updateSellerAddress: vi.fn(),
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

  it("should delegate to the repository with correct userId and data", async () => {
    mockUserRepo.updateSellerDetails.mockResolvedValue({
      message: "Seller details updated successfully",
    });

    const data = { storeName: "Updated Store" };

    const result = await userService.updateSellerDetails("user-1", data);

    expect(mockUserRepo.updateSellerDetails).toHaveBeenCalledWith(
      "user-1",
      data
    );
    expect(result).toEqual({ message: "Seller details updated successfully" });
  });

  it("should propagate errors thrown by the repository", async () => {
    mockUserRepo.updateSellerDetails.mockRejectedValue(
      new Error("User is not a seller")
    );

    await expect(
      userService.updateSellerDetails("user-4", { storeName: "X" })
    ).rejects.toThrow("User is not a seller");
  });
});

// ── createSellerAddress ──────────────────────────────────────────────────

describe("UserService — createSellerAddress", () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.user.findUnique = vi.fn();
    mockPrisma.planFeature.findUnique = vi.fn();
    mockUserRepo.createSellerAddress = vi.fn();

    userService = new UserService();
  });

  it("should call repo with canAddMultipleAddresses=true when user has the multiple_locations feature enabled", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionPlanId: "plan-premium",
    });
    mockPrisma.planFeature.findUnique.mockResolvedValue({ enabled: true });
    mockUserRepo.createSellerAddress.mockResolvedValue({
      id: "addr-uuid",
      streetAddress: "456 New St",
      city: "LA",
      state: "CA",
      zipCode: "90001",
      sellerId: "seller-1",
    });

    const data = { streetAddress: "456 New St", city: "LA", state: "CA", zipCode: "90001" };

    const result = await userService.createSellerAddress("user-1", data);

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
    expect(mockUserRepo.createSellerAddress).toHaveBeenCalledWith(
      "user-1",
      data,
      true
    );
    expect(result).toEqual({
      id: "addr-uuid",
      streetAddress: "456 New St",
      city: "LA",
      state: "CA",
      zipCode: "90001",
      sellerId: "seller-1",
    });
  });

  it("should call repo with canAddMultipleAddresses=false when user has no subscription", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionPlanId: null,
    });
    mockUserRepo.createSellerAddress.mockResolvedValue({
      id: "addr-uuid",
      streetAddress: "123 Main St",
      city: "SF",
      state: "CA",
      zipCode: "94105",
      sellerId: "seller-1",
    });

    const data = { streetAddress: "123 Main St", city: "SF", state: "CA", zipCode: "94105" };

    const result = await userService.createSellerAddress("user-2", data);

    expect(mockPrisma.planFeature.findUnique).not.toHaveBeenCalled();
    expect(mockUserRepo.createSellerAddress).toHaveBeenCalledWith(
      "user-2",
      data,
      false
    );
    expect(result).toEqual({
      id: "addr-uuid",
      streetAddress: "123 Main St",
      city: "SF",
      state: "CA",
      zipCode: "94105",
      sellerId: "seller-1",
    });
  });

  it("should propagate repository errors", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      subscriptionPlanId: null,
    });
    mockUserRepo.createSellerAddress.mockRejectedValue(
      new Error("Only premium users can add multiple addresses")
    );

    await expect(
      userService.createSellerAddress("user-3", {
        streetAddress: "789 Oak",
        city: "NYC",
        state: "NY",
        zipCode: "10001",
      })
    ).rejects.toThrow("Only premium users can add multiple addresses");
  });
});

// ── getSellerAddresses ───────────────────────────────────────────────────

describe("UserService — getSellerAddresses", () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepo.getSellerAddresses = vi.fn();
    userService = new UserService();
  });

  it("should delegate to the repository with correct userId", async () => {
    const mockAddresses = [
      { id: "addr-1", streetAddress: "123 Main", city: "SF", state: "CA", zipCode: "94105", sellerId: "s-1" },
    ];
    mockUserRepo.getSellerAddresses.mockResolvedValue(mockAddresses);

    const result = await userService.getSellerAddresses("user-1");

    expect(mockUserRepo.getSellerAddresses).toHaveBeenCalledWith("user-1");
    expect(result).toEqual(mockAddresses);
  });
});

// ── updateSellerAddress ──────────────────────────────────────────────────

describe("UserService — updateSellerAddress", () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepo.updateSellerAddress = vi.fn();
    userService = new UserService();
  });

  it("should delegate to the repository with correct params", async () => {
    const updatedAddress = {
      id: "addr-uuid",
      streetAddress: "456 Updated St",
      city: "LA",
      state: "CA",
      zipCode: "90001",
      sellerId: "s-1",
    };
    mockUserRepo.updateSellerAddress.mockResolvedValue(updatedAddress);

    const data = { streetAddress: "456 Updated St" };
    const result = await userService.updateSellerAddress("user-1", "addr-uuid", data);

    expect(mockUserRepo.updateSellerAddress).toHaveBeenCalledWith(
      "user-1",
      "addr-uuid",
      data
    );
    expect(result).toEqual(updatedAddress);
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
