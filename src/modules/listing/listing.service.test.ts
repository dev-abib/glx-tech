import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Hoisted mock objects ────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest, so any variable
// referenced inside vi.mock must also be hoisted via vi.hoisted().

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    listing: { findUnique: vi.fn() },
  },
}));

vi.mock("../../config/database.js", () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock("../../helpers/cloudinary.service.js", () => ({
  CloudinaryService: vi.fn().mockImplementation(function () {
    return { uploadFile: vi.fn(), deleteFile: vi.fn() };
  }),
}));

vi.mock("../user/user.repository.js", () => ({
  UserRepository: vi.fn().mockImplementation(function () {
    return { findUser: vi.fn() };
  }),
}));

// ── SUT ──────────────────────────────────────────────────────────────────

import { ListingService } from "./listing.service.js";
import { ApiError } from "../../utils/api-error.js";

describe("ListingService — getListingBySlug", () => {
  let listingService: ListingService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Assign a fresh mock for each test
    mockPrisma.listing.findUnique = vi.fn();

    listingService = new ListingService();
  });

  // ── Success ──────────────────────────────────────────────────────────

  it("should return the listing when a matching slug exists", async () => {
    const fakeListing = {
      id: "listing-id-1",
      userId: "user-1",
      title: "Professional Web Development",
      slug: "professional-web-development",
      description: "We build modern web applications",
      address: "123 Tech Street",
      serviceId: "service-1",
      basePrice: "500",
      user: { id: "user-1", name: "John", avatar: null, phone: "+123" },
      service: { id: "service-1", name: "Web Development" },
      userReview: [],
      media: [],
      days: ["Monday", "Tuesday"],
      weekend: ["Saturday", "Sunday"],
      timeSlot: ["09:00", "10:00"],
      hourlyPrice: "50",
      dailyPrice: "200",
      estimatedDuration: "2 weeks",
    };

    (mockPrisma.listing.findUnique as Mock).mockResolvedValue(fakeListing);

    const result = await listingService.getListingBySlug(
      "professional-web-development"
    );

    expect(mockPrisma.listing.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.listing.findUnique).toHaveBeenCalledWith({
      where: { slug: "professional-web-development" },
      include: expect.objectContaining({
        user: expect.any(Object),
        service: expect.any(Object),
        userReview: expect.any(Object),
      }),
    });
    expect(result).toEqual(fakeListing);
  });

  // ── Not found ────────────────────────────────────────────────────────

  it("should throw a 404 ApiError when the slug does not match any listing", async () => {
    (mockPrisma.listing.findUnique as Mock).mockResolvedValue(null);

    const promise = listingService.getListingBySlug("non-existent-slug");

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 404,
      message: "Listing not found",
    });

    expect(mockPrisma.listing.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.listing.findUnique).toHaveBeenCalledWith({
      where: { slug: "non-existent-slug" },
      include: expect.any(Object),
    });
  });

  // ── Database error ───────────────────────────────────────────────────

  it("should propagate database errors", async () => {
    const dbError = new Error("Database connection failed");
    (mockPrisma.listing.findUnique as Mock).mockRejectedValue(dbError);

    await expect(
      listingService.getListingBySlug("any-slug")
    ).rejects.toThrow("Database connection failed");
  });
});
