import { getPrismaClient } from "../../config/database.js";

const prisma = getPrismaClient();

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds

const planCache = new Map<string, CacheEntry<unknown>>();

function getFromCache<T>(key: string): T | null {
  const entry = planCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    planCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
  planCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function invalidateCache(pattern?: string): void {
  if (pattern) {
    for (const key of planCache.keys()) {
      if (key.startsWith(pattern)) planCache.delete(key);
    }
  } else {
    planCache.clear();
  }
}

interface UserPlanResult {
  planId: string | null;
  isFree: boolean;
  plan: { id: string; maxActiveListings: number; maxFeaturedListings: number; platformFeePercent: number } | null;
}

export class SubscriptionService {
  /**
   * Get the subscription plan for a user.
   */
  async getPlanForUser(userId: string): Promise<UserPlanResult> {
    const cacheKey = `plan:user:${userId}`;
    const cached = getFromCache<UserPlanResult>(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlanId: true,
        subscriptionPlan: {
          select: {
            id: true,
            maxActiveListings: true,
            maxFeaturedListings: true,
            platformFeePercent: true,
          },
        },
      },
    });

    const result: UserPlanResult = {
      planId: user?.subscriptionPlanId ?? null,
      isFree: !user?.subscriptionPlanId,
      plan: (user?.subscriptionPlan ?? null) as UserPlanResult["plan"],
    };

    setCache(cacheKey, result);
    return result;
  }

  /**
   * Check if a user's plan has a specific feature enabled.
   */
  async hasFeature(userId: string, featureKey: string): Promise<boolean> {
    const cacheKey = `feature:${userId}:${featureKey}`;
    const cached = getFromCache<boolean>(cacheKey);
    if (cached !== null) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlanId: true },
    });

    if (!user?.subscriptionPlanId) {
      setCache(cacheKey, false);
      return false;
    }

    const feature = await prisma.planFeature.findUnique({
      where: {
        planId_key: { planId: user.subscriptionPlanId, key: featureKey },
      },
      select: { enabled: true },
    });

    const enabled = feature?.enabled ?? false;
    setCache(cacheKey, enabled);
    return enabled;
  }

  /**
   * Check if a user can create a new listing based on their plan's maxActiveListings.
   */
  async canCreateListing(userId: string): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number }> {
    const cacheKey = `listingLimit:${userId}`;
    const cached = getFromCache<{ allowed: boolean; currentCount: number; maxAllowed: number }>(cacheKey);
    if (cached) return cached;

    const userPlan = await this.getPlanForUser(userId);

    // Free users get a default limit of 1
    const maxAllowed = userPlan.plan?.maxActiveListings ?? 1;

    const currentCount = await prisma.listing.count({
      where: { userId },
    });

    const allowed = currentCount < maxAllowed;
    const result = { allowed, currentCount, maxAllowed };

    setCache(cacheKey, result);
    return result;
  }

  /**
   * Check if a user can feature a listing based on their plan's maxFeaturedListings.
   */
  async canFeatureListing(userId: string): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number }> {
    const userPlan = await this.getPlanForUser(userId);

    // Free users get a default limit of 0 featured listings
    const maxAllowed = userPlan.plan?.maxFeaturedListings ?? 0;

    const currentCount = await prisma.listing.count({
      where: { userId, isFeatured: true },
    });

    const allowed = currentCount < maxAllowed || maxAllowed === -1; // -1 means unlimited
    return { allowed, currentCount, maxAllowed };
  }

  /**
   * Get the platform fee percentage for a user's plan.
   */
  async getPlatformFee(userId: string): Promise<number> {
    const userPlan = await this.getPlanForUser(userId);
    return userPlan.plan ? Number(userPlan.plan.platformFeePercent) : 5; // Default 5% for free
  }

  /**
   * Invalidate cache entries for a user (e.g., after plan change).
   */
  invalidateUserCache(userId: string): void {
    invalidateCache(`plan:user:${userId}`);
    invalidateCache(`feature:${userId}:`);
    invalidateCache(`listingLimit:${userId}`);
  }

  /**
   * Invalidate all caches.
   */
  clearAllCache(): void {
    planCache.clear();
  }
}
