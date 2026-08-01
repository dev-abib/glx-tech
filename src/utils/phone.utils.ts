/**
 * Mask a phone number so only the last 4 digits are exposed.
 *
 * Used on any API response that returns another user's (or a customer's)
 * phone number — admin lists, public listing details, etc. — so that
 * unencrypted full numbers are never leaked through the API.
 *
 * The owner's own profile endpoints (getMe / updateUser / updateSelf)
 * intentionally return the full number so the user can review/edit it.
 *
 * @example maskPhone("+1 (555) 123-4567")  → "****4567"
 * @example maskPhone(null)                  → null
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;

  const last4 = digits.slice(-4);
  if (digits.length <= 4) return `****${last4}`;

  return `****${last4}`;
}

/**
 * Whether a phone string is an already-masked value ("****4567").
 *
 * Update endpoints must skip masked values so a client that echoes back a
 * masked phone (e.g. an admin edit form prefilled from a list response)
 * never persists the masked string over the real number.
 */
export function isMaskedPhone(phone: string | null | undefined): boolean {
  return typeof phone === "string" && phone.startsWith("****");
}

import { z } from "zod";

/**
 * Zod schema for phone numbers in UPDATE flows.
 *
 * Accepts a real phone number OR an already-masked placeholder ("****4567")
 * that a client may echo back from a list response. Masked values pass
 * validation so the service-layer guard (isMaskedPhone) can skip them —
 * otherwise a prefilled edit form would fail with "Invalid phone number".
 * Creation schemas should keep the strict regex (masked values make no
 * sense when creating a user).
 */
export const updatePhoneSchema = z
  .string()
  .regex(/^(\+?[1-9]\d{7,14}|\*{4}\d{1,14})$/, "Invalid phone number")
  .optional();
