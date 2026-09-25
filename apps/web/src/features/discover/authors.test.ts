import { describe, expect, it, vi } from "vitest";
import { InMemoryDocumentSource } from "@/connectors/mock";
import { AuthorCache, OTHER_CAMPUS_AUTHOR, UNKNOWN_AUTHOR } from "./authors";

const profile = {
  displayName: "Deniz",
  universityId: "odtu",
  department: "Fizik",
  interests: [],
  skills: [],
  bio: "",
  verificationStatus: "verified",
  reputationScore: null,
  createdAt: null,
  updatedAt: null,
};

describe("AuthorCache", () => {
  it("aynı yazarı bir kez okur, başka kampüsü okumadan etiketler", async () => {
    const documents = new InMemoryDocumentSource(new Map([["users/u1", profile]]));
    const read = vi.spyOn(documents, "getDocument");
    const cache = new AuthorCache(documents, "odtu");
    const first = await cache.resolve([
      { uid: "u1", universityId: "odtu" },
      { uid: "u2", universityId: "itu" },
    ]);
    expect(first.get("u1")).toMatchObject({ name: "Deniz", department: "Fizik", verified: true });
    expect(first.get("u2")).toEqual(OTHER_CAMPUS_AUTHOR);
    await cache.resolve([{ uid: "u1", universityId: "odtu" }]);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("profili bulunamayan yazarı bilinmeyen olarak gösterir", async () => {
    const cache = new AuthorCache(new InMemoryDocumentSource(), "odtu");
    expect((await cache.resolve([{ uid: "yok", universityId: "odtu" }])).get("yok")).toEqual(UNKNOWN_AUTHOR);
  });
});
