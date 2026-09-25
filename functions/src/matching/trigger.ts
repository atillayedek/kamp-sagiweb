import { FUNCTIONS_REGION } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../lib/admin";
import { computeMatches } from "./engine";

const MAX_EVENT_AGE_MS = 60 * 60 * 1000;

async function markFailed(needId: string) {
  const ref = db().doc(`needs/${needId}`);
  await db().runTransaction(async (transaction) => {
    const need = await transaction.get(ref);
    if (need.exists && need.get("matchStatus") !== "done") transaction.update(ref, { matchStatus: "failed" });
  });
}

export const matchOnNeedCreated = onDocumentCreated(
  { document: "needs/{needId}", region: FUNCTIONS_REGION, timeoutSeconds: 120, retry: true },
  async (event) => {
    const needId = event.params.needId;
    if (Date.now() - Date.parse(event.time) > MAX_EVENT_AGE_MS) {
      logger.error("matching.gaveUp", { needId });
      await markFailed(needId);
      return;
    }
    try {
      await computeMatches({ firestore: db() }, needId);
    } catch (error) {
      logger.warn("matching.retrying", { needId, errorName: error instanceof Error ? error.name : "unknown" });
      throw error;
    }
  },
);
