import { describe, expect, it } from "vitest";
import {
  commentTextSchema,
  createClubRequestSchema,
  createEventRequestSchema,
  postTextSchema,
  reportContentRequestSchema,
  reportTargetPath,
  reportTargetSchema,
} from "./community";

const event = {
  eventId: "etkinlik-12345",
  title: "Satranç turnuvası",
  description: "Herkes davetli.\nTahta getirmeyi unutma.",
  location: "Merkez kütüphane",
  startsAt: "2026-10-01T18:00:00+03:00",
  endsAt: "2026-10-01T21:00:00+03:00",
  visibility: "campus",
};

describe("gönderi ve yorum metni", () => {
  it("satır sonuna izin verir, diğer kontrol karakterlerini reddeder", () => {
    expect(postTextSchema.safeParse("Merhaba\nkampüs").success).toBe(true);
    expect(postTextSchema.safeParse("Merhaba\u0007").success).toBe(false);
    expect(commentTextSchema.safeParse("   ").success).toBe(false);
    expect(commentTextSchema.safeParse("x".repeat(501)).success).toBe(false);
  });
});

describe("createClub", () => {
  it("adı kırpar ve sınırları uygular", () => {
    const parsed = createClubRequestSchema.parse({
      clubId: "kulup-12345",
      name: "  Satranç Kulübü ",
      description: "Her perşembe akşamı oynuyoruz.",
      visibility: "campus",
    });
    expect(parsed.name).toBe("Satranç Kulübü");
    expect(createClubRequestSchema.safeParse({ ...parsed, name: "ab" }).success).toBe(false);
    expect(createClubRequestSchema.safeParse({ ...parsed, founderUid: "x" }).success).toBe(false);
  });

  it("yalnızca simge veya emojiden oluşan adı reddeder", () => {
    const base = { clubId: "kulup-12345", description: "Her perşembe akşamı oynuyoruz.", visibility: "campus" };
    expect(createClubRequestSchema.safeParse({ ...base, name: "🎸🎸🎸" }).success).toBe(false);
    expect(createClubRequestSchema.safeParse({ ...base, name: "C# ?!" }).success).toBe(false);
    expect(createClubRequestSchema.safeParse({ ...base, name: "C# Kulübü" }).success).toBe(true);
  });
});

describe("createEvent", () => {
  it("geçerli etkinliği kabul eder, bitişsiz etkinliğe izin verir", () => {
    expect(createEventRequestSchema.safeParse(event).success).toBe(true);
    expect(createEventRequestSchema.safeParse({ ...event, endsAt: null, description: "" }).success).toBe(true);
  });

  it("başlangıçtan önce biten veya 72 saatten uzun etkinliği reddeder", () => {
    expect(createEventRequestSchema.safeParse({ ...event, endsAt: "2026-10-01T17:00:00+03:00" }).success).toBe(false);
    expect(createEventRequestSchema.safeParse({ ...event, endsAt: "2026-10-05T18:00:00+03:00" }).success).toBe(false);
  });
});

describe("reportContent", () => {
  it("hedef yolunu türüne göre üretir", () => {
    expect(reportTargetPath({ type: "post", postId: "p1" })).toBe("posts/p1");
    expect(reportTargetPath({ type: "comment", postId: "p1", commentId: "c1" })).toBe("posts/p1/comments/c1");
    expect(reportTargetPath({ type: "club", clubId: "k1" })).toBe("clubs/k1");
    expect(reportTargetPath({ type: "event", eventId: "e1" })).toBe("events/e1");
    expect(reportTargetPath({ type: "need", needId: "n1" })).toBe("needs/n1");
  });

  it("yol enjeksiyonunu ve eksik kimliği reddeder", () => {
    expect(reportTargetSchema.safeParse({ type: "post", postId: "../users/x" }).success).toBe(false);
    expect(reportTargetSchema.safeParse({ type: "post", postId: "a/b" }).success).toBe(false);
    expect(reportTargetSchema.safeParse({ type: "comment", postId: "p1" }).success).toBe(false);
    expect(reportTargetSchema.safeParse({ type: "user", uid: "x" }).success).toBe(false);
  });

  it("“Diğer” sebebi için açıklama ister", () => {
    const base = { target: { type: "post", postId: "p1" }, details: "" };
    expect(reportContentRequestSchema.safeParse({ ...base, reason: "spam" }).success).toBe(true);
    expect(reportContentRequestSchema.safeParse({ ...base, reason: "other" }).success).toBe(false);
    expect(reportContentRequestSchema.safeParse({ ...base, reason: "other", details: "Sahte hesap gibi" }).success).toBe(true);
    expect(reportContentRequestSchema.safeParse({ ...base, reason: "spam", details: "x".repeat(501) }).success).toBe(false);
  });
});
