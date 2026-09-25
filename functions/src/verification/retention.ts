import { VERIFICATION_RETENTION_DAYS } from "@kampusagi/contracts";

const DAY_MS = 24 * 60 * 60 * 1000;

export function purgeDateFrom(decidedAt: Date, retentionDays = VERIFICATION_RETENTION_DAYS): Date {
  return new Date(decidedAt.getTime() + retentionDays * DAY_MS);
}
