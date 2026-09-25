import { logger } from "firebase-functions";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { z } from "zod";

const needSchema = z.object({
  authorUid: z.string().min(1),
  status: z.string(),
  parsed: z.object({ title: z.string() }),
});

function notificationPath(authorUid: string, needId: string, interestedUid: string) {
  return `notifications/${authorUid}/items/interest_${needId}_${interestedUid}`;
}

export async function notifyInterest(
  deps: { firestore: Firestore; now?: () => Date },
  needId: string,
  interestedUid: string,
): Promise<"created" | "exists" | "skipped"> {
  const { firestore } = deps;
  const need = needSchema.safeParse((await firestore.doc(`needs/${needId}`).get()).data());
  if (!need.success || need.data.status !== "open" || need.data.authorUid === interestedUid) return "skipped";
  const interestRef = firestore.doc(`needs/${needId}/interests/${interestedUid}`);
  const notificationRef = firestore.doc(notificationPath(need.data.authorUid, needId, interestedUid));
  const outcome = await firestore.runTransaction(async (transaction) => {
    const [interest, notification] = await Promise.all([transaction.get(interestRef), transaction.get(notificationRef)]);
    if (!interest.exists) return "skipped" as const;
    if (notification.exists) return "exists" as const;
    transaction.create(notificationRef, {
      type: "need-interest",
      payload: { needId, title: need.data.parsed.title, fromUid: interestedUid },
      read: false,
      createdAt: Timestamp.fromDate((deps.now ?? (() => new Date()))()),
    });
    return "created" as const;
  });
  if (outcome === "created") logger.info("interest.notified", { needId });
  return outcome;
}

export async function withdrawInterestNotification(deps: { firestore: Firestore }, needId: string, interestedUid: string) {
  const need = await deps.firestore.doc(`needs/${needId}`).get();
  const authorUid = need.get("authorUid");
  if (typeof authorUid !== "string") return false;
  const ref = deps.firestore.doc(notificationPath(authorUid, needId, interestedUid));
  return deps.firestore.runTransaction(async (transaction) => {
    const [interest, notification] = await Promise.all([
      transaction.get(deps.firestore.doc(`needs/${needId}/interests/${interestedUid}`)),
      transaction.get(ref),
    ]);
    if (interest.exists || !notification.exists) return false;
    transaction.delete(ref);
    return true;
  });
}
