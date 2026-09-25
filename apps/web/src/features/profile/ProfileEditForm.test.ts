import type { PublicProfile } from "@kampusagi/contracts";
import { describe, expect, it } from "vitest";
import { changedFields } from "./ProfileEditForm";

const profile: PublicProfile = {
  displayName: "Deniz",
  universityId: "odtu",
  department: "Bilgisayar Mühendisliği",
  interests: ["basketbol"],
  skills: ["python"],
  bio: "",
  verificationStatus: "unverified",
  reputationScore: null,
  createdAt: null,
  updatedAt: null,
};

describe("changedFields", () => {
  it("değişmeyen alanları göndermez", () => {
    expect(
      changedFields(profile, { displayName: " Deniz ", department: profile.department, interests: "Basketbol", skills: "python", bio: "" }),
    ).toEqual({});
  });

  it("yalnızca değişen alanları döndürür", () => {
    expect(
      changedFields(profile, { displayName: "Deniz Y.", department: profile.department, interests: "basketbol, satranç", skills: "python", bio: "" }),
    ).toEqual({ displayName: "Deniz Y.", interests: ["basketbol", "satranç"] });
  });
});
