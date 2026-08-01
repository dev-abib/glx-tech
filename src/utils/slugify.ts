import { getPrismaClient } from "../config/database.js";

/**
 * Convert a title into a URL-safe slug.
 *
 * @example slugifyTitle("Professional Web Development!") → "professional-web-development"
 */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // strip punctuation
    .replace(/[\s_]+/g, "-") // spaces/underscores → dashes
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "listing";
}

/**
 * Generate a globally unique listing slug derived from the title.
 *
 * Listing slugs are unique across the whole table, so two sellers posting
 * listings with the same title would otherwise collide. This resolves
 * collisions by appending "-2", "-3", … and finally a random suffix so a
 * create/update never fails with a unique-constraint error.
 *
 * @param title  the listing title used to derive the base slug
 * @param excludeId optional listing id to ignore when checking uniqueness (updates)
 */
export async function generateUniqueListingSlug(
  title: string,
  excludeId?: string
): Promise<string> {
  const prisma = getPrismaClient();
  const base = slugifyTitle(title);

  // Try the clean slug first.
  const baseExists = await prisma.listing.findUnique({
    where: { slug: base },
    select: { id: true },
  });
  if (!baseExists || baseExists.id === excludeId) return base;

  // Try numeric suffixes.
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    const existing = await prisma.listing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }

  // Extremely unlikely fallback — random suffix guarantees uniqueness.
  const random = Math.random().toString(36).slice(2, 8);
  return `${base}-${random}`;
}
