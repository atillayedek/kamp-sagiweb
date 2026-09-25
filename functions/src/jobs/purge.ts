import { FUNCTIONS_REGION } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, defaultBucket } from "../lib/admin";
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
