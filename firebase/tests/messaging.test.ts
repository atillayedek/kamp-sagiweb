import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";
import { actors } from "./actors";
import { createTestEnv } from "./setup";

let env: RulesTestEnvironment;
let a: ReturnType<typeof actors>;

const message = (senderUid: string, text = "Merhaba") => ({ senderUid, text, createdAt: serverTimestamp() });

beforeAll(async () => {
  env = await createTestEnv();
  a = actors(env);
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "conversations/ab"), { participants: ["odtuA", "odtuB"], unreadCounts: { odtuA: 0, odtuB: 0 } });
    await setDoc(doc(db, "conversations/ac"), { participants: ["odtuA", "ituC"], unreadCounts: {} });
    await setDoc(doc(db, "conversations/ab/messages/m1"), { senderUid: "odtuA", text: "Selam" });
    await setDoc(doc(db, "notifications/odtuA/items/n1"), { type: "match", payload: {}, read: false });
    await setDoc(doc(db, "blocks/ituC/blocked/odtuA"), { createdAt: new Date() });
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("conversations ve messages", () => {
  it("katılımcı konuşmayı ve mesajları okur; üçüncü kişi okuyamaz", async () => {
    await assertSucceeds(getDoc(doc(a.odtuB, "conversations/ab")));
    await assertSucceeds(getDoc(doc(a.odtuB, "conversations/ab/messages/m1")));
    await assertFails(getDoc(doc(a.ituC, "conversations/ab")));
    await assertFails(getDoc(doc(a.ituC, "conversations/ab/messages/m1")));
  });

  it("konuşma listesi yalnızca kendi katılımıyla sorgulanır", async () => {
    await assertSucceeds(getDocs(query(collection(a.odtuB, "conversations"), where("participants", "array-contains", "odtuB"))));
    await assertFails(getDocs(collection(a.odtuB, "conversations")));
  });

  it("konuşmayı ve okunmamış sayacını istemci değiştiremez", async () => {
    await assertFails(setDoc(doc(a.odtuA, "conversations/yeni"), { participants: ["odtuA", "odtuB"] }));
    await assertFails(updateDoc(doc(a.odtuA, "conversations/ab"), { "unreadCounts.odtuB": 0 }));
  });

  it("katılımcı kendi adına mesaj gönderir", async () => {
    await assertSucceeds(setDoc(doc(a.odtuB, "conversations/ab/messages/m2"), message("odtuB")));
  });

  it("başkası adına, katılımcı olmadan veya doğrulanmadan mesaj gönderilemez", async () => {
    await assertFails(setDoc(doc(a.odtuB, "conversations/ab/messages/m3"), message("odtuA")));
    await assertFails(setDoc(doc(a.ituC, "conversations/ab/messages/m4"), message("ituC")));
    await assertFails(setDoc(doc(a.unverified, "conversations/ab/messages/m5"), message("yeni")));
  });

  it("engelleyen tarafa mesaj gönderilemez", async () => {
    await assertFails(setDoc(doc(a.odtuA, "conversations/ac/messages/m6"), message("odtuA")));
  });

  it("engelleyen de engellediği kişiye yazamaz", async () => {
    await assertFails(setDoc(doc(a.ituC, "conversations/ac/messages/m7"), message("ituC")));
  });

  it("boş veya çok uzun mesaj, fazladan alan reddedilir", async () => {
    await assertFails(setDoc(doc(a.odtuB, "conversations/ab/messages/m8"), message("odtuB", "")));
    await assertFails(setDoc(doc(a.odtuB, "conversations/ab/messages/m9"), message("odtuB", "x".repeat(2001))));
    await assertFails(setDoc(doc(a.odtuB, "conversations/ab/messages/m10"), { ...message("odtuB"), system: true }));
  });

  it("mesaj düzenlenemez ve silinemez", async () => {
    await assertFails(updateDoc(doc(a.odtuA, "conversations/ab/messages/m1"), { text: "Değişti" }));
    await assertFails(deleteDoc(doc(a.odtuA, "conversations/ab/messages/m1")));
  });
});

describe("notifications", () => {
  it("yalnızca sahibi okur ve yalnızca okundu işaretler", async () => {
    await assertSucceeds(getDoc(doc(a.odtuA, "notifications/odtuA/items/n1")));
    await assertFails(getDoc(doc(a.odtuB, "notifications/odtuA/items/n1")));
    await assertFails(updateDoc(doc(a.odtuA, "notifications/odtuA/items/n1"), { read: true, type: "admin" }));
    await assertFails(updateDoc(doc(a.odtuA, "notifications/odtuA/items/n1"), { read: false }));
    await assertSucceeds(updateDoc(doc(a.odtuA, "notifications/odtuA/items/n1"), { read: true }));
  });

  it("istemci bildirim oluşturamaz veya silemez", async () => {
    await assertFails(setDoc(doc(a.odtuA, "notifications/odtuB/items/sahte"), { type: "match", read: false }));
    await assertFails(setDoc(doc(a.odtuA, "notifications/odtuA/items/sahte"), { type: "match", read: false }));
    await assertFails(deleteDoc(doc(a.odtuA, "notifications/odtuA/items/n1")));
  });
});

describe("blocks", () => {
  it("kendi engel listesine ekler ve kaldırır", async () => {
    await assertSucceeds(setDoc(doc(a.odtuA, "blocks/odtuA/blocked/odtuB"), { createdAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(a.odtuA, "blocks/odtuA/blocked/odtuB")));
  });

  it("kendini engelleyemez, başkasının listesini göremez veya değiştiremez", async () => {
    await assertFails(setDoc(doc(a.odtuA, "blocks/odtuA/blocked/odtuA"), { createdAt: serverTimestamp() }));
    await assertFails(getDoc(doc(a.odtuA, "blocks/ituC/blocked/odtuA")));
    await assertFails(deleteDoc(doc(a.odtuA, "blocks/ituC/blocked/odtuA")));
  });
});
