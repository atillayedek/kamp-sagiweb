import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { notifyInterest, withdrawInterestNotification } from "./notify";

const app = initializeApp({ projectId: "demo-kampusagi-matching" }, "interest-test");
const firestore = getFirestore(app);
const run = Date.now();
const author = `yazar-${run}`;

async function need(status = "open") {
  const id = `ilgi-${run}-${Math.random().toString(36).slice(2, 8)}`;
  await firestore.doc(`needs/${id}`).set({ authorUid: author, status, parsed: { title: "Akşam basketbol" } });
  return id;
}

async function interest(needId: string, uid = "aday") {
  await firestore.doc(`needs/${needId}/interests/${uid}`).set({ uid, needId, createdAt: new Date() });
}

const notification = (needId: string, uid = "aday") => firestore.doc(`notifications/${author}/items/interest_${needId}_${uid}`);

describe("notifyInterest", () => {
  it("ilan sahibine bir kez bildirim yazar", async () => {
    const id = await need();
    await interest(id);
    expect(await notifyInterest({ firestore }, id, "aday")).toBe("created");
    expect(await notifyInterest({ firestore }, id, "aday")).toBe("exists");
    expect((await notification(id).get()).data()).toMatchObject({
      type: "need-interest",
      read: false,
      payload: { needId: id, title: "Akşam basketbol", fromUid: "aday" },
    });
  });

  it("geri alınmış ilgi için bildirim yazmaz", async () => {
    const id = await need();
    expect(await notifyInterest({ firestore }, id, "aday")).toBe("skipped");
    expect((await notification(id).get()).exists).toBe(false);
  });

  it("kapalı ilan, kendi ilanı ve olmayan ilan için bildirim yazmaz", async () => {
    const closed = await need("closed");
    await interest(closed);
    expect(await notifyInterest({ firestore }, closed, "aday")).toBe("skipped");
    expect(await notifyInterest({ firestore }, await need(), author)).toBe("skipped");
    expect(await notifyInterest({ firestore }, "olmayan-ilan", "aday")).toBe("skipped");
  });
});

describe("withdrawInterestNotification", () => {
  it("ilgi silinince bildirimi kaldırır", async () => {
    const id = await need();
    await interest(id);
    await notifyInterest({ firestore }, id, "aday");
    await firestore.doc(`needs/${id}/interests/aday`).delete();
    expect(await withdrawInterestNotification({ firestore }, id, "aday")).toBe(true);
    expect((await notification(id).get()).exists).toBe(false);
  });

  it("ilgi hâlâ varsa bildirime dokunmaz", async () => {
    const id = await need();
    await interest(id);
    await notifyInterest({ firestore }, id, "aday");
    expect(await withdrawInterestNotification({ firestore }, id, "aday")).toBe(false);
    expect((await notification(id).get()).exists).toBe(true);
  });
});
