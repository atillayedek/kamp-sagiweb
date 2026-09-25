import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";
import { actors } from "./actors";
import { createTestEnv } from "./setup";

let env: RulesTestEnvironment;
let a: ReturnType<typeof actors>;

const campusNeed = { authorUid: "odtuA", universityId: "odtu", visibility: "campus", rawText: "Basketbol", status: "open" };
const globalNeed = { ...campusNeed, visibility: "global" };

beforeAll(async () => {
  env = await createTestEnv();
  a = actors(env);
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "needs/kampus"), campusNeed);
    await setDoc(doc(db, "needs/genel"), globalNeed);
    await setDoc(doc(db, "needs/kampus/matches/odtuB"), { score: 80, reasons: ["Aynı kampüstesiniz"], status: "suggested" });
    await setDoc(doc(db, "posts/kampus"), { authorUid: "odtuA", universityId: "odtu", visibility: "campus", text: "Merhaba", likeCount: 0, commentCount: 0 });
    await setDoc(doc(db, "posts/genel"), { authorUid: "ituC", universityId: "itu", visibility: "global", text: "Herkese", likeCount: 0, commentCount: 0 });
    await setDoc(doc(db, "posts/kampus/comments/y1"), { authorUid: "odtuB", text: "Selam" });
    await setDoc(doc(db, "clubs/satranc"), { name: "Satranç", universityId: "odtu", visibility: "campus", memberCount: 0 });
    await setDoc(doc(db, "events/turnuva"), { title: "Turnuva", universityId: "odtu", visibility: "campus", attendeeCount: 0 });
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("needs — kampüs izolasyonu", () => {
  it("aynı üniversitedeki doğrulanmış öğrenci kampüs ilanını okur", async () => {
    await assertSucceeds(getDoc(doc(a.odtuB, "needs/kampus")));
  });

  it("başka üniversiteden öğrenci kampüs ilanını okuyamaz", async () => {
    await assertFails(getDoc(doc(a.ituC, "needs/kampus")));
  });

  it("genel ilanı başka üniversiteden doğrulanmış öğrenci okur", async () => {
    await assertSucceeds(getDoc(doc(a.ituC, "needs/genel")));
  });

  it("doğrulanmamış, sahte claim'li ve anonim kullanıcı hiçbir ilanı okuyamaz", async () => {
    for (const db of [a.unverified, a.fakeVerified, a.anonymous]) {
      await assertFails(getDoc(doc(db, "needs/genel")));
      await assertFails(getDoc(doc(db, "needs/kampus")));
    }
  });

  it("kampüs sorgusu yalnızca kendi üniversitesiyle filtrelenince izinlidir", async () => {
    await assertSucceeds(getDocs(query(collection(a.odtuB, "needs"), where("universityId", "==", "odtu"))));
    await assertFails(getDocs(query(collection(a.ituC, "needs"), where("universityId", "==", "odtu"))));
    await assertFails(getDocs(collection(a.ituC, "needs")));
    await assertSucceeds(getDocs(query(collection(a.ituC, "needs"), where("visibility", "==", "global"))));
  });

  it("ilanı istemci doğrudan oluşturamaz veya değiştiremez", async () => {
    await assertFails(setDoc(doc(a.odtuA, "needs/yeni"), campusNeed));
    await assertFails(updateDoc(doc(a.odtuA, "needs/kampus"), { status: "closed" }));
  });
});

describe("needs — doğrulaması kalkmış yazar", () => {
  it("doğrulanmamış yazar kendi ilanını bile okuyamaz", async () => {
    const revoked = env.authenticatedContext("odtuA").firestore();
    await assertFails(getDoc(doc(revoked, "needs/kampus")));
    await assertFails(getDocs(query(collection(revoked, "needs"), where("authorUid", "==", "odtuA"))));
  });
});

describe("needs/matches — skor yalnızca sunucuda", () => {
  it("eşleşme listesini üçüncü kişi sorgulayamaz", async () => {
    await assertFails(getDocs(collection(a.ituC, "needs/kampus/matches")));
    await assertSucceeds(getDocs(collection(a.odtuA, "needs/kampus/matches")));
  });

  it("aday kendi eşleşmesini, ilan sahibi adayı okur; üçüncü kişi okuyamaz", async () => {
    await assertSucceeds(getDoc(doc(a.odtuB, "needs/kampus/matches/odtuB")));
    await assertSucceeds(getDoc(doc(a.odtuA, "needs/kampus/matches/odtuB")));
    await assertFails(getDoc(doc(a.ituC, "needs/kampus/matches/odtuB")));
  });

  it("aday kendi skorunu değiştiremez", async () => {
    await assertFails(updateDoc(doc(a.odtuB, "needs/kampus/matches/odtuB"), { score: 100 }));
    await assertFails(updateDoc(doc(a.odtuB, "needs/kampus/matches/odtuB"), { status: "dismissed" }));
  });

  it("ilan sahibi yalnızca durumu dismissed yapabilir", async () => {
    await assertFails(updateDoc(doc(a.odtuA, "needs/kampus/matches/odtuB"), { status: "dismissed", score: 5 }));
    await assertFails(updateDoc(doc(a.odtuA, "needs/kampus/matches/odtuB"), { reasons: ["uydurma"] }));
    await assertFails(updateDoc(doc(a.odtuA, "needs/kampus/matches/odtuB"), { status: "accepted" }));
    await assertSucceeds(updateDoc(doc(a.odtuA, "needs/kampus/matches/odtuB"), { status: "dismissed" }));
  });

  it("kimse istemciden eşleşme oluşturamaz", async () => {
    await assertFails(setDoc(doc(a.odtuB, "needs/kampus/matches/ituC"), { score: 99, status: "suggested" }));
  });
});

describe("posts — görünürlük, sayaçlar ve kimlik", () => {
  const valid = () => ({
    authorUid: "odtuA",
    universityId: "odtu",
    visibility: "campus",
    text: "Kütüphane 3. kat çok sessiz.",
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });

  it("doğrulanmış öğrenci kendi üniversitesine gönderi oluşturur", async () => {
    await assertSucceeds(setDoc(doc(a.odtuA, "posts/p-gecerli"), valid()));
  });

  it("başka üniversite adına veya başkası adına gönderi oluşturamaz", async () => {
    await assertFails(setDoc(doc(a.odtuA, "posts/p-baska-uni"), { ...valid(), universityId: "itu" }));
    await assertFails(setDoc(doc(a.odtuA, "posts/p-taklit"), { ...valid(), authorUid: "odtuB" }));
  });

  it("sayaçları sıfırdan farklı başlatamaz ve fazladan alan ekleyemez", async () => {
    await assertFails(setDoc(doc(a.odtuA, "posts/p-sayac"), { ...valid(), likeCount: 1000 }));
    await assertFails(setDoc(doc(a.odtuA, "posts/p-alan"), { ...valid(), pinned: true }));
  });

  it("doğrulanmamış kullanıcı gönderi oluşturamaz", async () => {
    await assertFails(setDoc(doc(a.unverified, "posts/p-dogrulanmamis"), { ...valid(), authorUid: "yeni" }));
  });

  it("boş veya çok uzun metni reddeder, geçmiş tarih veremez", async () => {
    await assertFails(setDoc(doc(a.odtuA, "posts/p-bos"), { ...valid(), text: "" }));
    await assertFails(setDoc(doc(a.odtuA, "posts/p-uzun"), { ...valid(), text: "x".repeat(1001) }));
    await assertFails(setDoc(doc(a.odtuA, "posts/p-tarih"), { ...valid(), createdAt: new Date("2020-01-01") }));
  });

  it("görünürlük kuralını uygular", async () => {
    await assertSucceeds(getDoc(doc(a.odtuB, "posts/kampus")));
    await assertFails(getDoc(doc(a.ituC, "posts/kampus")));
    await assertSucceeds(getDoc(doc(a.odtuB, "posts/genel")));
  });

  it("yayınlanan gönderi yazar dahil kimse tarafından değiştirilemez (rapor kanıtı korunur)", async () => {
    await assertFails(updateDoc(doc(a.odtuA, "posts/kampus"), { text: "Düzeltildi", editedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(a.odtuA, "posts/kampus"), { likeCount: 999 }));
    await assertFails(updateDoc(doc(a.odtuA, "posts/kampus"), { visibility: "global" }));
    await assertFails(updateDoc(doc(a.odtuB, "posts/kampus"), { text: "Hack" }));
    await assertFails(deleteDoc(doc(a.odtuA, "posts/kampus")));
  });

  it("gönderi liste sorguları görünürlük filtresi ister", async () => {
    await assertSucceeds(getDocs(query(collection(a.odtuB, "posts"), where("universityId", "==", "odtu"))));
    await assertSucceeds(getDocs(query(collection(a.ituC, "posts"), where("visibility", "==", "global"))));
    await assertFails(getDocs(query(collection(a.ituC, "posts"), where("universityId", "==", "odtu"))));
    await assertFails(getDocs(collection(a.odtuB, "posts")));
    await assertFails(getDocs(query(collection(a.unverified, "posts"), where("visibility", "==", "global"))));
  });
});

describe("posts/comments ve likes", () => {
  it("gönderiyi göremeyen yorumları da göremez ve yorum yapamaz", async () => {
    await assertFails(getDoc(doc(a.ituC, "posts/kampus/comments/y1")));
    await assertFails(setDoc(doc(a.ituC, "posts/kampus/comments/y2"), { authorUid: "ituC", text: "Selam", createdAt: serverTimestamp() }));
  });

  it("aynı üniversiteden öğrenci yorum yapar, başkası adına yapamaz", async () => {
    await assertSucceeds(setDoc(doc(a.odtuB, "posts/kampus/comments/y3"), { authorUid: "odtuB", text: "Katılıyorum", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(a.odtuB, "posts/kampus/comments/y4"), { authorUid: "odtuA", text: "Taklit", createdAt: serverTimestamp() }));
  });

  it("yorum listesi gönderiyi göremeyene kapalı, yorum değiştirilemez", async () => {
    await assertSucceeds(getDocs(collection(a.odtuB, "posts/kampus/comments")));
    await assertFails(getDocs(collection(a.ituC, "posts/kampus/comments")));
    await assertFails(updateDoc(doc(a.odtuB, "posts/kampus/comments/y1"), { text: "Değişti", editedAt: serverTimestamp() }));
  });

  it("genel gönderiye başka üniversiteden yorum yapılabilir", async () => {
    await assertSucceeds(setDoc(doc(a.odtuA, "posts/genel/comments/y5"), { authorUid: "odtuA", text: "Güzel", createdAt: serverTimestamp() }));
  });

  it("beğeni yalnızca kendi kimliğiyle ve görülebilen gönderiye verilir", async () => {
    await assertSucceeds(setDoc(doc(a.odtuB, "posts/kampus/likes/odtuB"), { createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(a.odtuB, "posts/kampus/likes/odtuA"), { createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(a.ituC, "posts/kampus/likes/ituC"), { createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(a.odtuA, "posts/kampus/likes/odtuA"), { createdAt: serverTimestamp(), weight: 10 }));
  });

  it("beğeni geri alınabilir, başkasınınki alınamaz", async () => {
    await assertFails(deleteDoc(doc(a.odtuA, "posts/kampus/likes/odtuB")));
    await assertSucceeds(deleteDoc(doc(a.odtuB, "posts/kampus/likes/odtuB")));
  });
});

describe("clubs ve events", () => {
  it("kulüp ve etkinlik istemciden oluşturulamaz", async () => {
    await assertFails(setDoc(doc(a.odtuA, "clubs/yeni"), { name: "X", universityId: "odtu", visibility: "campus", memberCount: 0 }));
    await assertFails(setDoc(doc(a.moderator, "events/yeni"), { title: "X", universityId: "odtu", visibility: "campus" }));
  });

  it("başka üniversiteden öğrenci kampüs kulübüne katılamaz", async () => {
    await assertFails(setDoc(doc(a.ituC, "clubs/satranc/members/ituC"), { joinedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(a.odtuB, "clubs/satranc/members/odtuB"), { joinedAt: serverTimestamp() }));
  });

  it("başkasını üye yapamaz, üye sayısını değiştiremez", async () => {
    await assertFails(setDoc(doc(a.odtuB, "clubs/satranc/members/odtuA"), { joinedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(a.odtuB, "clubs/satranc"), { memberCount: 500 }));
  });

  it("kulüp ve etkinlik listeleri görünürlük filtresi ister", async () => {
    await assertSucceeds(getDocs(query(collection(a.odtuB, "clubs"), where("universityId", "==", "odtu"))));
    await assertFails(getDocs(query(collection(a.ituC, "clubs"), where("universityId", "==", "odtu"))));
    await assertFails(getDocs(collection(a.ituC, "events")));
    await assertSucceeds(getDocs(query(collection(a.ituC, "events"), where("visibility", "==", "global"))));
    await assertFails(getDocs(collection(a.ituC, "clubs/satranc/members")));
  });

  it("etkinliğe kendi adına katılır ve ayrılır", async () => {
    await assertSucceeds(setDoc(doc(a.odtuA, "events/turnuva/attendees/odtuA"), { joinedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(a.ituC, "events/turnuva/attendees/ituC"), { joinedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(a.odtuA, "events/turnuva/attendees/odtuA")));
  });
});

describe("users — öğrenci rehberi çıkarılamaz", () => {
  beforeAll(async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/odtuA"), { displayName: "Deniz", universityId: "odtu" });
    });
  });

  it("aynı üniversiteden tekil profil okunur ama üniversite listesi sorgulanamaz", async () => {
    await assertSucceeds(getDoc(doc(a.odtuB, "users/odtuA")));
    await assertFails(getDocs(query(collection(a.odtuB, "users"), where("universityId", "==", "odtu"))));
    await assertFails(getDocs(collection(a.odtuB, "users")));
  });

  it("moderatör listeleyebilir", async () => {
    await assertSucceeds(getDocs(collection(a.moderator, "users")));
  });
});
