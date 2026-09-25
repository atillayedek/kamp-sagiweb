import { FUNCTIONS_REGION } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { db } from "../lib/admin";
import { notifyInterest, withdrawInterestNotification } from "./notify";

const MAX_EVENT_AGE_MS = 60 * 60 * 1000;
const document = "needs/{needId}/interests/{uid}";

function tooOld(time: string, name: string, needId: string) {
  if (Date.now() - Date.parse(time) <= MAX_EVENT_AGE_MS) return false;
  logger.error(name, { needId });
  return true;
}

export const notifyOnInterest = onDocumentCreated({ document, region: FUNCTIONS_REGION, retry: true }, async (event) => {
  if (tooOld(event.time, "interest.gaveUp", event.params.needId)) return;
  await notifyInterest({ firestore: db() }, event.params.needId, event.params.uid);
});

export const withdrawOnInterestDeleted = onDocumentDeleted({ document, region: FUNCTIONS_REGION, retry: true }, async (event) => {
  if (tooOld(event.time, "interest.withdrawGaveUp", event.params.needId)) return;
  await withdrawInterestNotification({ firestore: db() }, event.params.needId, event.params.uid);
});
