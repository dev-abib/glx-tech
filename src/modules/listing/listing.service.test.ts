import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ── Hoisted mock objects ────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest, so any variable
// referenced inside vi.mock must also be hoisted via vi.hoisted().

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    listing: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    sellerInfo: { findUnique: vi.fn() },
    selleraddress: { findUnique: vi.fn() },
    service: { findMany: vi.fn() },
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

// Helper: give the user an active Premium plan so the membership gate passes.
function mockActivePlan() {
  (mockPrisma.user.findUnique as Mock).mockResolvedValue({
    subscriptionPlanId: "plan-premium",
    subscriptionPlan: {
      id: "plan-premium",
      slug: "premium",
      maxActiveListings: 50,
      maxFeaturedListings: 10,
      platformFeePercent: 0,
    },
  });
}

describe("ListingService — getListingBySlug", () => {
  let listingService: ListingService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Assign a fresh mock for each test
    mockPrisma.listing.findUnique = vi.fn();
    mockPrisma.listing.findFirst = vi.fn();

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
      serviceId: "service-1",
      basePrice: "500",
      user: { id: "user-1", name: "John", avatar: null },
      service: { id: "service-1", name: "Web Development" },
      userReview: [],
      media: [],
      hourlyPrice: "50",
      dailyPrice: "200",
    };

    (mockPrisma.listing.findFirst as Mock).mockResolvedValue(fakeListing);

    const result = await listingService.getListingBySlug(
      "professional-web-development"
    );

    expect(mockPrisma.listing.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.listing.findFirst).toHaveBeenCalledWith({
      where: {
        slug: "professional-web-development",
        user: { isActive: true },
      },
      include: expect.objectContaining({
        user: expect.any(Object),
        service: expect.any(Object),
        userReview: expect.any(Object),
      }),
    });
    expect(result.user.name).toBe("John");
  });

  // ── Not found ────────────────────────────────────────────────────────

  it("should throw a 404 ApiError when the slug does not match any listing", async () => {
    (mockPrisma.listing.findFirst as Mock).mockResolvedValue(null);

    const promise = listingService.getListingBySlug("non-existent-slug");

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 404,
      message: "Listing not found",
    });

    expect(mockPrisma.listing.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.listing.findFirst).toHaveBeenCalledWith({
      where: { slug: "non-existent-slug", user: { isActive: true } },
      include: expect.any(Object),
    });
  });

  // ── Database error ───────────────────────────────────────────────────

  it("should propagate database errors", async () => {
    const dbError = new Error("Database connection failed");
    (mockPrisma.listing.findFirst as Mock).mockRejectedValue(dbError);

    await expect(
      listingService.getListingBySlug("any-slug")
    ).rejects.toThrow("Database connection failed");
  });
});

describe("ListingService — getAllListings location filter", () => {
  let listingService: ListingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.listing.findMany = vi.fn();
    mockPrisma.listing.count = vi.fn();
    mockPrisma.user.findMany = vi.fn();

    // No expired sellers — the lapse sweep hides nothing.
    (mockPrisma.user.findMany as Mock).mockResolvedValue([]);
    (mockPrisma.listing.findMany as Mock).mockResolvedValue([]);
    (mockPrisma.listing.count as Mock).mockResolvedValue(0);

    listingService = new ListingService();
  });

  it("should add a case-insensitive address AND/OR filter when location is provided", async () => {
    const result = await listingService.getAllListings({
      page: 1,
      limit: 10,
      location: "New York",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.listings).toEqual([]);

    const findManyCall = (mockPrisma.listing.findMany as Mock).mock
      .calls[0][0];
    expect(findManyCall.where).toEqual(
      expect.objectContaining({
        user: { isActive: true },
        AND: [
          {
            OR: expect.arrayContaining([
              {
                address: {
                  city: { contains: "New York", mode: "insensitive" },
                },
              },
              {
                address: {
                  state: { contains: "New York", mode: "insensitive" },
                },
              },
              {
                address: {
                  zipCode: { contains: "New York", mode: "insensitive" },
                },
              },
              {
                address: {
                  streetAddress: {
                    contains: "New York",
                    mode: "insensitive",
                  },
                },
              },
            ]),
          },
        ],
      })
    );
  });

  it("should NOT add the location AND filter when location is omitted", async () => {
    await listingService.getAllListings({
      page: 1,
      limit: 10,
      search: "plumber",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const findManyCall = (mockPrisma.listing.findMany as Mock).mock
      .calls[0][0];
    expect(findManyCall.where.user).toEqual({ isActive: true });
    expect(findManyCall.where.AND).toBeUndefined();
    // Text search still applies as a top-level OR.
    expect(findManyCall.where.OR).toBeDefined();
  });

  it("should combine location AND + text-search OR when both are provided", async () => {
    await listingService.getAllListings({
      page: 1,
      limit: 10,
      search: "oil change",
      location: "Brooklyn",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const findManyCall = (mockPrisma.listing.findMany as Mock).mock
      .calls[0][0];
    expect(findManyCall.where.AND).toBeDefined();
    expect(findManyCall.where.OR).toBeDefined();
  });
});

describe("ListingService — getAllListings empty-result fallback", () => {
  let listingService: ListingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.listing.findMany = vi.fn();
    mockPrisma.listing.count = vi.fn();
    mockPrisma.user.findMany = vi.fn();

    // No expired sellers — the lapse sweep hides nothing.
    (mockPrisma.user.findMany as Mock).mockResolvedValue([]);
    (mockPrisma.listing.count as Mock).mockResolvedValue(0);

    listingService = new ListingService();
  });

  const fakeListing = {
    id: "listing-fallback-1",
    userId: "user-1",
    title: "Plumbing Services",
    slug: "plumbing-services",
    description: "Professional plumbing",
    serviceId: "service-1",
    basePrice: "100",
    media: [],
    user: {
      id: "user-1",
      name: "John",
      email: "john@test.com",
      avatar: null,
      isVerifiedSeller: false,
      sellerInfo: null,
    },
    address: {
      id: "addr-1",
      streetAddress: "1 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
    },
    service: { id: "service-1", name: "Plumbing" },
    userReview: [{ rating: 5 }],
    _count: { userReview: 1 },
  };

  it("should return random fallback listings + 'no listing found' message when a keyword matches nothing", async () => {
    // Main query returns no matches; the fallback query returns one random listing.
    (mockPrisma.listing.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([fakeListing]);

    const result = await listingService.getAllListings({
      page: 1,
      limit: 10,
      search: "nonexistent-keyword",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.isFallback).toBe(true);
    expect(result.message).toContain('No listing found for "nonexistent-keyword"');
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({
      id: "listing-fallback-1",
      avgRating: 5,
    });
    expect(result.pagination).toMatchObject({ total: 0, totalPages: 0 });
  });

  it("should return fallback listings with a generic message when the list is empty without a keyword", async () => {
    (mockPrisma.listing.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([fakeListing]);

    const result = await listingService.getAllListings({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.isFallback).toBe(true);
    expect(result.message).toBe("No listing found");
    expect(result.listings).toHaveLength(1);
  });

  it("should NOT fall back when fallbackWhenEmpty is false (admin view)", async () => {
    (mockPrisma.listing.findMany as Mock).mockResolvedValue([]);

    const result = await listingService.getAllListings(
      {
        page: 1,
        limit: 10,
        search: "nothing",
        sortBy: "createdAt",
        sortOrder: "desc",
      },
      { fallbackWhenEmpty: false }
    );

    expect(result.listings).toEqual([]);
    expect(result.message).toBeUndefined();
    expect(result.isFallback).toBeUndefined();
  });

  it("should return matching listings without a fallback message when the keyword matches", async () => {
    (mockPrisma.listing.findMany as Mock).mockResolvedValue([fakeListing]);
    (mockPrisma.listing.count as Mock).mockResolvedValue(1);

    const result = await listingService.getAllListings({
      page: 1,
      limit: 10,
      search: "plumbing",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({ id: "listing-fallback-1" });
    expect(result.message).toBeUndefined();
    expect(result.isFallback).toBeUndefined();
  });

  it("should fall back when a serviceName filter matches no services", async () => {
    // In the serviceName path listing.findMany is only called by the
    // fallback (no main-query fetch happens before the early return).
    (mockPrisma.listing.findMany as Mock).mockResolvedValue([fakeListing]);
    (mockPrisma.service.findMany as Mock).mockResolvedValue([]);

    const result = await listingService.getAllListings({
      page: 1,
      limit: 10,
      serviceName: "ghost-service",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.isFallback).toBe(true);
    expect(result.listings).toHaveLength(1);
  });
});

describe("ListingService — per-seller unique listing title", () => {
  let listingService: ListingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.listing.findUnique = vi.fn();
    mockPrisma.listing.findFirst = vi.fn();
    mockPrisma.listing.count = vi.fn();
    mockPrisma.user.findUnique = vi.fn();

    listingService = new ListingService();
  });

  it("should throw 409 when creating a listing with a title the seller already has (case-insensitive)", async () => {
    // Membership gate: user has a plan with free slots.
    mockActivePlan();
    (mockPrisma.listing.count as Mock).mockResolvedValue(0);
    // Existing listing with a differently-cased title.
    (mockPrisma.listing.findFirst as Mock).mockResolvedValue({
      id: "existing-listing",
    });

    const promise = listingService.createListing(
      {
        title: "Oil Change",
        serviceId: "service-1",
        description: "Fast oil change service",
        addressId: "address-1",
        isAvailable: true,
      } as never,
      "user-1",
      []
    );

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('"Oil Change"'),
    });

    // The title check must be case-insensitive.
    expect(mockPrisma.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          title: { equals: "Oil Change", mode: "insensitive" },
        },
      })
    );
  });

  it("should allow creating a listing when the title is unique for the seller", async () => {
    mockActivePlan();
    (mockPrisma.listing.count as Mock).mockResolvedValue(0);
    // No duplicate title.
    (mockPrisma.listing.findFirst as Mock).mockResolvedValue(null);

    // Satisfy the remaining create flow checks so we reach the DB create.
    (mockPrisma.sellerInfo.findUnique as Mock).mockResolvedValue({
      id: "seller-info-1",
      servicesId: ["service-1"],
    });
    (mockPrisma.selleraddress.findUnique as Mock).mockResolvedValue({
      id: "address-1",
      streetAddress: "1 Main St",
      city: "Brooklyn",
      state: "NY",
      zipCode: "11201",
    });
    (mockPrisma.listing.findUnique as Mock).mockResolvedValue(null);
    (mockPrisma.listing.create as Mock).mockResolvedValue({
      id: "new-listing",
      title: "Brake Repair",
      slug: "brake-repair",
    });

    const result = await listingService.createListing(
      {
        title: "Brake Repair",
        serviceId: "service-1",
        description: "Brake pads and rotors",
        addressId: "address-1",
        isAvailable: true,
      } as never,
      "user-2", // distinct ID → no collision with the subscription TTL cache
      []
    );

    expect(mockPrisma.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-2",
          title: { equals: "Brake Repair", mode: "insensitive" },
        },
      })
    );
    expect(result.data.listingId).toBe("new-listing");
  });

  it("should throw 409 when updating a listing to a title another of the seller's listings already has", async () => {
    // The listing being updated belongs to the seller.
    (mockPrisma.listing.findUnique as Mock).mockResolvedValue({
      id: "listing-1",
      userId: "user-3",
      title: "Old Title",
    });
    // Active membership.
    mockActivePlan();
    // Another listing (different id) already uses the new title.
    (mockPrisma.listing.findFirst as Mock).mockResolvedValue({
      id: "listing-2",
    });

    const promise = listingService.updateListing(
      "listing-1",
      "user-3", // distinct ID → no collision with the subscription TTL cache
      { title: "Oil Change" } as never
    );

    await expect(promise).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('"Oil Change"'),
    });
    expect(mockPrisma.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-3",
          title: { equals: "Oil Change", mode: "insensitive" },
          id: { not: "listing-1" },
        },
      })
    );
  });

  it("should allow updating a title that stays unique for the seller", async () => {
    (mockPrisma.listing.findUnique as Mock).mockResolvedValue({
      id: "listing-1",
      userId: "user-4",
      title: "Old Title",
      media: null,
    });
    mockActivePlan();
    // No other listing uses the new title.
    (mockPrisma.listing.findFirst as Mock).mockResolvedValue(null);
    (mockPrisma.listing.update as Mock).mockResolvedValue({
      id: "listing-1",
      title: "New Title",
      slug: "new-title",
    });

    const result = await listingService.updateListing(
      "listing-1",
      "user-4", // distinct ID → no collision with the subscription TTL cache
      { title: "New Title" } as never
    );

    expect(result.title).toBe("New Title");
    expect(mockPrisma.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-4",
          title: { equals: "New Title", mode: "insensitive" },
          id: { not: "listing-1" },
        },
      })
    );
  });
});
