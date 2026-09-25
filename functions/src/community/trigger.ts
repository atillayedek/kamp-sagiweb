import { FUNCTIONS_REGION } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { onDocumentWritten, type Change, type DocumentSnapshot, type FirestoreEvent } from "firebase-functions/v2/firestore";
import { db } from "../lib/admin";
import { applyCounterEvent, counterDelta, type CountedCollection } from "./counters";

const MAX_EVENT_AGE_MS = 60 * 60 * 1000;

type WrittenEvent = FirestoreEvent<Change<DocumentSnapshot> | undefined, { parentId: string }>;

async function count(collection: CountedCollection, event: WrittenEvent) {
  const { parentId } = event.params;
  const before = event.data?.before;
  const after = event.data?.after;
  const input = {
    eventId: event.id,
    collection,
    parentId,
    delta: counterDelta(Boolean(before?.exists), Boolean(after?.exists)),
    childCreatedAt: (after?.exists ? after.createTime : before?.createTime)?.toMillis() ?? null,
  };
  const expired = Date.now() - Date.parse(event.time) > MAX_EVENT_AGE_MS;
  try {
    await applyCounterEvent({ firestore: db() }, input);
  } catch (error) {
    // Son deneme: sayaç bir birim sapabilir; olay kaydı Faz 13 sayaç denetimi için log'da kalır.
    if (expired) {
      logger.error("counter.gaveUp", { collection, parentId, delta: input.delta });
      return;
    }
    throw error;
  }
}

const options = <Document extends string>(document: Document) => ({ document, region: FUNCTIONS_REGION, retry: true });

export const countPostLikes = onDocumentWritten(options("posts/{parentId}/likes/{memberId}"), (event) => count("likes", event));

export const countPostComments = onDocumentWritten(options("posts/{parentId}/comments/{memberId}"), (event) =>
  count("comments", event),
);

export const countClubMembers = onDocumentWritten(options("clubs/{parentId}/members/{memberId}"), (event) => count("members", event));

export const countEventAttendees = onDocumentWritten(options("events/{parentId}/attendees/{memberId}"), (event) =>
  count("attendees", event),
);
