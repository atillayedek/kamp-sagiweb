import { FUNCTIONS_REGION } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, defaultBucket } from "../lib/admin";
import { purgeExpired } from "../needs/service";
import { purgeExpiredVerificationFiles, purgeOrphanVerificationFiles } from "../verification/service";

export const purgeVerificationFiles = onSchedule(
  { schedule: "every day 03:30", timeZone: "Europe/Istanbul", region: FUNCTIONS_REGION },
  async () => {
    const deps = { firestore: db(), bucket: defaultBucket() };
    const now = new Date();
    const expired = await purgeExpiredVerificationFiles(deps, now);
    const orphans = await purgeOrphanVerificationFiles(deps, now);
    logger.info("verification.purge", { expired, orphans });
  },
);

// Üretimde asıl temizlik Firestore TTL ilkeleriyle yapılır (Faz 14); bu iş emniyet ağıdır.
const PURGE_CAP = 300 * 50;

export const purgeExpiredRecords = onSchedule(
  { schedule: "every day 04:00", timeZone: "Europe/Istanbul", region: FUNCTIONS_REGION, timeoutSeconds: 540 },
  async () => {
    const now = new Date();
    const counts = {
      drafts: await purgeExpired(db(), "needDrafts", now),
      rateLimits: await purgeExpired(db(), "rateLimits", now),
      counterEvents: await purgeExpired(db(), "counterEvents", now),
    };
    logger.info("records.purge", counts);
    const capped = Object.entries(counts).filter(([, total]) => total >= PURGE_CAP).map(([name]) => name);
    if (capped.length > 0) logger.warn("records.purgeCapped", { collections: capped, cap: PURGE_CAP });
  },
);
