import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

// Functions emulator'ın tetikleyicileri çalıştırdığı proje: sayaç tetikleyicisinin kayıtlı ve çalışır olduğunu doğrular.
const app = initializeApp({ projectId: "demo-kampusagi" }, "community-trigger-test");
const firestore = getFirestore(app);
const run = `${Date.now()}`;

async function until(read: () => Promise<unknown>, expected: unknown, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (value !== expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    value = await read();
  }
  return value;
}

describe("sayaç tetikleyicileri", () => {
  it("beğeni ve yorum sayılarını sunucuda günceller", async () => {
    const ref = firestore.doc(`posts/sayac-${run}`);
    await ref.set({
      authorUid: "yazar",
      universityId: "odtu",
      visibility: "campus",
      text: "Merhaba",
      likeCount: 0,
      commentCount: 0,
      createdAt: Timestamp.now(),
    });
    await ref.collection("likes").doc("okur").set({ createdAt: Timestamp.now() });
    await ref.collection("comments").doc("y1").set({ authorUid: "okur", text: "Selam", createdAt: Timestamp.now() });
    expect(await until(async () => (await ref.get()).get("likeCount"), 1)).toBe(1);
    expect(await until(async () => (await ref.get()).get("commentCount"), 1)).toBe(1);

    await ref.collection("likes").doc("okur").delete();
    expect(await until(async () => (await ref.get()).get("likeCount"), 0)).toBe(0);
  });

  it("kulüp üyeliği sayısını günceller", async () => {
    const ref = firestore.doc(`clubs/sayac-${run}`);
    await ref.set({ name: "Satranç", universityId: "odtu", visibility: "campus", memberCount: 0 });
    await ref.collection("members").doc("uye").set({ joinedAt: Timestamp.now() });
    expect(await until(async () => (await ref.get()).get("memberCount"), 1)).toBe(1);
  });
});
