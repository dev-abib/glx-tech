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
  plan: { id: string; slug: string; maxActiveListings: number; maxFeaturedListings: number; platformFeePercent: number } | null;
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
            slug: true,
            maxActiveListings: true,
            maxFeaturedListings: true,
            platformFeePercent: true,
          },
        },
      },
    });

    const result: UserPlanResult = {
      planId: user?.subscriptionPlanId ?? null,
      // The Free tier is still "free" even though it is a real membership.
      isFree:
        !user?.subscriptionPlanId || user?.subscriptionPlan?.slug === "free",
      plan: (user?.subscriptionPlan ?? null) as UserPlanResult["plan"],
    };

    // Don't cache planless users — they may subscribe later
    if (result.planId) {
      setCache(cacheKey, result);
    }
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

    // Don't cache users without a plan — they may subscribe later
    if (!user?.subscriptionPlanId) {
      return false;
    }

    const feature = await prisma.planFeature.findUnique({
      where: {
        planId_key: { planId: user.subscriptionPlanId, key: featureKey },
      },
      select: { enabled: true },
    });

    const enabled = feature?.enabled ?? false;
    // Cache for users WITH a plan — the plan doesn't change often and
    // we invalidate cache via Stripe webhook handlers when it does
    setCache(cacheKey, enabled);
    return enabled;
  }

  /**
   * Whether a user currently holds an active membership.
   *
   * Any assigned plan (including the Free tier, which IS a real membership)
   * counts as active. Users without any plan — including sellers who never
   * activated a membership — do NOT have an active membership and therefore
   * cannot create or manage listings.
   */
  async hasActiveMembership(userId: string): Promise<boolean> {
    const userPlan = await this.getPlanForUser(userId);
    return !!userPlan.plan;
  }

  /**
   * Check if a user can create a new listing based on their plan's maxActiveListings.
   *
   * Membership is strictly enforced: users without any plan (no free tier, no
   * paid subscription) cannot create listings at all. Activating a seller
   * account assigns the Free tier, so every active seller has a plan.
   */
  async canCreateListing(userId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
    reason: "membership_required" | "limit_reached" | null;
  }> {
    const cacheKey = `listingLimit:${userId}`;
    const cached = getFromCache<{
      allowed: boolean;
      currentCount: number;
      maxAllowed: number;
      reason: "membership_required" | "limit_reached" | null;
    }>(cacheKey);
    if (cached) return cached;

    const userPlan = await this.getPlanForUser(userId);

    let maxAllowed: number;
    if (userPlan.plan) {
      maxAllowed = userPlan.plan.maxActiveListings;
    } else {
      // No plan at all — no membership, no listings.
      const result = {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        reason: "membership_required" as const,
      };
      setCache(cacheKey, result);
      return result;
    }

    const currentCount = await prisma.listing.count({
      where: { userId },
    });

    const allowed = currentCount < maxAllowed;
    const result = {
      allowed,
      currentCount,
      maxAllowed,
      reason: allowed ? null : ("limit_reached" as const),
    };

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
   * Hide all of a seller's listings because their subscription lapsed or
   * ended (grace period over). Keeps the rows (appointment history stays
   * valid) but marks them unavailable + isHiddenByLapse so a later renewal
   * can restore exactly the auto-hidden ones.
   */
  async hideListingsForLapse(userId: string): Promise<number> {
    const result = await prisma.listing.updateMany({
      where: { userId, isAvailable: true },
      data: { isAvailable: false, isHiddenByLapse: true },
    });
    this.invalidateUserCache(userId);
    return result.count;
  }

  /**
   * Restore listings that were auto-hidden by a subscription lapse (called
   * after a renewal / reactivation). Only touches listings flagged with
   * isHiddenByLapse — listings the seller manually hid stay hidden.
   */
  async restoreLapsedListings(userId: string): Promise<number> {
    const result = await prisma.listing.updateMany({
      where: { userId, isHiddenByLapse: true },
      data: { isAvailable: true, isHiddenByLapse: false },
    });
    this.invalidateUserCache(userId);
    return result.count;
  }

  // TTL guard so the sweep runs at most once per minute per process.
  private lastLapseSweepAt: number = 0;

  /**
   * Lazy sweep for sellers whose grace period has passed: subscription is
   * past_due/canceled AND currentPeriodEnd is in the past → auto-hide their
   * listings. TTL-guarded (60s) so it's cheap to call on the public listing
   * endpoint. No cron infrastructure needed.
   */
  async hideExpiredListings(force: boolean = false): Promise<number> {
    const now = Date.now();
    if (!force && now - this.lastLapseSweepAt < 60_000) return 0;
    this.lastLapseSweepAt = now;

    const expiredUsers = await prisma.user.findMany({
      where: {
        isSeller: true,
        subscriptionStatus: {
          in: ["past_due", "unpaid", "canceled"],
        },
        OR: [
          // past_due/unpaid sellers whose grace period has ended
          { currentPeriodEnd: { lt: new Date() } },
          // canceled sellers (subscription actually ended — period end cleared)
          { subscriptionStatus: "canceled" },
        ],
      },
      select: { id: true },
    });

    let hidden = 0;
    for (const u of expiredUsers) {
      hidden += await this.hideListingsForLapse(u.id);
    }
    return hidden;
  }

  /**
   * Invalidate all caches.
   */
  clearAllCache(): void {
    planCache.clear();
  }
}
