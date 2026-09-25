import { Timestamp } from "firebase-admin/firestore";

/** `rateLimits` belgelerinin saklama süresi; gün anahtarı değişse de sayaç en az bir tam gün kalır. */
export const RATE_LIMIT_TTL_MS = 48 * 60 * 60 * 1000;

export function rateLimitExpiry(now: Date): Timestamp {
  return Timestamp.fromMillis(now.getTime() + RATE_LIMIT_TTL_MS);
}
