import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { reserveTokens, settleTokens, TOKEN_SHARDS, tokenShardRefs } from "./budget";

const app = initializeApp({ projectId: "demo-kampusagi" }, "budget-test");
const firestore = getFirestore(app);
const run = Date.now();

async function total(now: Date) {
  const shards = await Promise.all(tokenShardRefs(firestore, now).map((ref) => ref.get()));
  return shards.reduce((sum, shard) => sum + ((shard.get("tokens") as number | undefined) ?? 0), 0);
}

describe("token bütçesi", () => {
  it("eşzamanlı rezervasyonlarda günlük tavanı aşmaz", async () => {
    const now = new Date(Date.UTC(2040, 0, 1) + (run % 10_000) * 24 * 60 * 60 * 1000);
    const budget = TOKEN_SHARDS * 100;
    const results = await Promise.all(Array.from({ length: 40 }, () => reserveTokens(firestore, now, budget, 40)));
    const granted = results.filter((result) => result !== null).length;
    expect(granted).toBeGreaterThan(0);
    expect(granted * 40).toBeLessThanOrEqual(budget);
    expect(await total(now)).toBe(granted * 40);
  });

  it("gerçek kullanımla mutabakat yapar", async () => {
    const now = new Date(Date.UTC(2041, 0, 1) + (run % 10_000) * 24 * 60 * 60 * 1000);
    const reservation = await reserveTokens(firestore, now, 1_000_000, 40_000, () => 0);
    expect(reservation).not.toBeNull();
    await settleTokens(reservation!, 1_200);
    expect(await total(now)).toBe(1_200);
  });
});
