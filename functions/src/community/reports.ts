import { reportTargetPath, type ReportReason, type ReportTarget } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { Timestamp, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { appError } from "../lib/errors";
import { shortHash } from "../lib/hash";
import { requireVerifiedActor, type VerifiedActor } from "../lib/profile";
import { maskPii } from "../needs/text";
import { reserveDaily } from "./limits";

const SNAPSHOT_MAX = 2000;

type Resolved = {
  /** Görünürlüğü belirleyen belge (yorum için gönderisi). */
  scope: DocumentSnapshot;
  /** Bildirilen belgenin kendisi. */
  target: DocumentSnapshot;
  ownerUid: unknown;
  ownerUniversityId: unknown;
  title: string | null;
  text: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.slice(0, SNAPSHOT_MAX) : "";
}

async function resolveTarget(firestore: Firestore, target: ReportTarget, path: string): Promise<Resolved | null> {
  const snapshot = await firestore.doc(path).get();
  if (!snapshot.exists) return null;
  const get = (field: string) => snapshot.get(field) as unknown;
  const own = { scope: snapshot, target: snapshot, ownerUniversityId: get("universityId") };
  switch (target.type) {
    case "post":
      return { ...own, ownerUid: get("authorUid"), title: null, text: text(get("text")) };
    case "comment": {
      const post = await firestore.doc(`posts/${target.postId}`).get();
      if (!post.exists) return null;
      return {
        scope: post,
        target: snapshot,
        ownerUid: get("authorUid"),
        ownerUniversityId: get("authorUniversityId"),
        title: null,
        text: text(get("text")),
      };
    }
    case "club":
      return { ...own, ownerUid: get("founderUid"), title: text(get("name")), text: text(get("description")) };
    case "event":
      return {
        ...own,
        ownerUid: get("organizerUid"),
        title: text(get("title")),
        text: text(`Yer: ${text(get("location"))}\n${text(get("description"))}`),
      };
    case "need":
      return { ...own, ownerUid: get("authorUid"), title: text(snapshot.get("parsed.title")), text: text(get("rawText")) };
  }
}

export async function reportContent(
  deps: { firestore: Firestore; dailyReports: number; now?: () => Date },
  actor: VerifiedActor,
  input: { target: ReportTarget; reason: ReportReason; details: string },
): Promise<{ reportId: string; status: "created" | "duplicate" }> {
  const { firestore } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const targetPath = reportTargetPath(input.target);

  const reporterUniversityId = await requireVerifiedActor(firestore, actor);
  const resolved = await resolveTarget(firestore, input.target, targetPath);
  const scopeUniversityId = resolved?.scope.get("universityId") as unknown;
  const visibility = resolved?.scope.get("visibility") as unknown;
  const visible =
    resolved !== null &&
    typeof resolved.ownerUid === "string" &&
    typeof scopeUniversityId === "string" &&
    (visibility === "global" || scopeUniversityId === reporterUniversityId);
  if (!resolved || !visible) throw appError("not-found", "İçerik bulunamadı veya kaldırılmış.");
  if (resolved.ownerUid === actor.uid) throw appError("invalid-argument", "Kendi içeriğini bildiremezsin.");

  // Aynı yolda yeniden oluşturulan içerik ayrı bir hedef sayılır (oluşturma zamanı kimliğe girer).
  const targetKey = shortHash(`${targetPath}@${resolved.target.createTime?.toMillis() ?? 0}`);
  const reportId = shortHash(`${actor.uid}:${targetKey}`);
  const reportRef = firestore.doc(`reports/${reportId}`);
  const createdAt = resolved.target.get("createdAt") as unknown;

  const outcome = await firestore.runTransaction(async (transaction) => {
    if ((await transaction.get(reportRef)).exists) return "duplicate" as const;
    const commit = await reserveDaily(transaction, { firestore, uid: actor.uid, now, counter: "reports", limit: deps.dailyReports });
    transaction.create(reportRef, {
      reporterUid: actor.uid,
      reporterUniversityId,
      targetType: input.target.type,
      targetPath,
      targetKey,
      targetOwnerUid: resolved.ownerUid,
      targetUniversityId: typeof resolved.ownerUniversityId === "string" ? resolved.ownerUniversityId : scopeUniversityId,
      reason: input.reason,
      details: maskPii(input.details).text,
      snapshot: {
        title: resolved.title,
        text: resolved.text,
        visibility: visibility === "campus" || visibility === "global" ? visibility : null,
        createdAt: createdAt instanceof Timestamp ? createdAt : null,
      },
      status: "open",
      createdAt: Timestamp.fromDate(now),
    });
    commit();
    return "created" as const;
  });
  if (outcome === "created") logger.info("report.created", { reportId, targetType: input.target.type, reason: input.reason });
  return { reportId, status: outcome };
}
