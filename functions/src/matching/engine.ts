import { NEED_CATEGORY_LABELS, needCategorySchema } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { Timestamp, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { z } from "zod";
import { loadMatchingConfig, type MatchingConfig } from "./config";
import { scoreCandidate, type CandidateScore, type ScoringNeed } from "./score";

export type MatchRunResult = {
  status: "done" | "skipped" | "invalid";
  candidates: number;
  created: number;
  total: number;
  durationMs: number;
};

type Scored = { uid: string } & CandidateScore;

const ARRAY_QUERY_LIMIT = 30;
const ALREADY_EXISTS = 6;

const labels = z.array(z.string()).catch([]);

const needSchema = z.object({
  authorUid: z.string().min(1),
  universityId: z.string().min(1),
  status: z.string(),
  parsed: z.object({
    title: z.string(),
    category: needCategorySchema,
    tags: labels,
    requiredSkills: labels,
  }),
});

const candidateSchema = z.object({
  universityId: z.string(),
  interests: labels,
  skills: labels,
  department: z.string().catch(""),
});

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function relevantCandidates(firestore: Firestore, need: ScoringNeed, config: MatchingConfig) {
  const interestTerms = [...new Set([...config.categoryTerms[need.category], ...need.tags])];
  const skillTerms = [...new Set([...interestTerms, ...need.requiredSkills])];
  const base = firestore
    .collection("users")
    .where("universityId", "==", need.universityId)
    .where("verificationStatus", "==", "verified")
    .select("universityId", "interests", "skills", "department");
  const queries = [
    ...chunks(interestTerms, ARRAY_QUERY_LIMIT).map((terms) => base.where("interests", "array-contains-any", terms)),
    ...chunks(skillTerms, ARRAY_QUERY_LIMIT).map((terms) => base.where("skills", "array-contains-any", terms)),
  ];
  const snapshots = await Promise.all(queries.map((query) => query.limit(config.maxCandidates).get()));
  const byId = new Map<string, z.output<typeof candidateSchema>>();
  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) {
      if (byId.has(document.id)) continue;
      const parsed = candidateSchema.safeParse(document.data());
      if (parsed.success) byId.set(document.id, parsed.data);
    }
  }
  return byId;
}

async function withoutBlocked(firestore: Firestore, authorUid: string, ranked: Scored[], wanted: number) {
  const selected: Scored[] = [];
  for (const batch of chunks(ranked, Math.max(wanted, 10))) {
    const refs = batch.flatMap((result) => [
      firestore.doc(`blocks/${authorUid}/blocked/${result.uid}`),
      firestore.doc(`blocks/${result.uid}/blocked/${authorUid}`),
    ]);
    const snapshots = await firestore.getAll(...refs);
    batch.forEach((result, index) => {
      if (!snapshots[index * 2]!.exists && !snapshots[index * 2 + 1]!.exists) selected.push(result);
    });
    if (selected.length >= wanted) break;
  }
  return selected.slice(0, wanted);
}

async function createIfMissing(ref: DocumentReference, data: Record<string, unknown>) {
  try {
    await ref.create(data);
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === ALREADY_EXISTS) return false;
    throw error;
  }
}

export async function computeMatches(
  deps: { firestore: Firestore; now?: () => Date; config?: MatchingConfig },
  needId: string,
): Promise<MatchRunResult> {
  const startedAt = Date.now();
  const { firestore } = deps;
  const needRef = firestore.doc(`needs/${needId}`);
  const result = (status: MatchRunResult["status"], candidates = 0, created = 0, total = 0): MatchRunResult => ({
    status,
    candidates,
    created,
    total,
    durationMs: Date.now() - startedAt,
  });

  const snapshot = await needRef.get();
  if (!snapshot.exists || snapshot.get("status") !== "open" || snapshot.get("matchStatus") === "done") {
    return result("skipped");
  }
  const parsedNeed = needSchema.safeParse(snapshot.data());
  if (!parsedNeed.success) {
    await needRef.update({ matchStatus: "failed" });
    logger.error("matching.invalidNeed", { needId });
    return result("invalid");
  }
  const need = parsedNeed.data;
  const config = deps.config ?? (await loadMatchingConfig(firestore));
  const [author, existingMatches] = await Promise.all([
    firestore.doc(`users/${need.authorUid}`).get(),
    needRef.collection("matches").select().get(),
  ]);
  const scoringNeed: ScoringNeed = {
    universityId: need.universityId,
    category: need.parsed.category,
    categoryLabel: NEED_CATEGORY_LABELS[need.parsed.category],
    tags: need.parsed.tags,
    requiredSkills: need.parsed.requiredSkills,
    authorDepartment: z.string().catch("").parse(author.get("department")),
  };
  const candidates = await relevantCandidates(firestore, scoringNeed, config);
  candidates.delete(need.authorUid);

  const ranked: Scored[] = [...candidates.entries()]
    .map(([uid, candidate]) => ({ uid, ...scoreCandidate(scoringNeed, candidate, config) }))
    .filter((scored) => scored.relevant && scored.score >= config.minScore)
    .sort((a, b) => b.score - a.score || (a.uid < b.uid ? -1 : 1));

  const existing = new Set(existingMatches.docs.map((document) => document.id));
  const selected = await withoutBlocked(firestore, need.authorUid, ranked, config.maxMatches);
  const stamp = Timestamp.fromDate((deps.now ?? (() => new Date()))());
  let created = 0;
  await Promise.all(
    selected
      .filter((scored) => !existing.has(scored.uid))
      .map(async (scored) => {
        const fresh = await createIfMissing(needRef.collection("matches").doc(scored.uid), {
          candidateUid: scored.uid,
          needId,
          needAuthorUid: need.authorUid,
          score: scored.score,
          breakdown: scored.breakdown,
          reasons: scored.reasons,
          weightsVersion: config.version,
          status: "suggested",
          createdAt: stamp,
        });
        await createIfMissing(firestore.doc(`notifications/${scored.uid}/items/match_${needId}`), {
          type: "need-match",
          payload: { needId, title: need.parsed.title, score: scored.score },
          read: false,
          createdAt: stamp,
        });
        if (fresh) created += 1;
      }),
  );
  const total = (await needRef.collection("matches").count().get()).data().count;
  await needRef.update({ matchStatus: "done", matchCount: total, matchedAt: stamp });

  const run = result("done", candidates.size, created, total);
  logger.info("matching.done", { needId, candidates: run.candidates, created, total, durationMs: run.durationMs });
  return run;
}
