import { PROFILE_LIMITS } from "@kampusagi/contracts";
import type { z } from "zod";

export type ProfileField = "displayName" | "universityId" | "department" | "interests" | "skills" | "bio" | "acceptedTermsVersion";

export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

const messages: Record<ProfileField, string> = {
  displayName: `Adın ${PROFILE_LIMITS.displayName.min}–${PROFILE_LIMITS.displayName.max} karakter olmalı.`,
  universityId: "Üniversiteni seç.",
  department: `Bölümün ${PROFILE_LIMITS.department.min}–${PROFILE_LIMITS.department.max} karakter olmalı.`,
  interests: `En fazla ${PROFILE_LIMITS.tags.max} ilgi alanı ekleyebilirsin; her biri en fazla 30 karakter.`,
  skills: `En fazla ${PROFILE_LIMITS.tags.max} beceri ekleyebilirsin; her biri en fazla 30 karakter.`,
  bio: `Tanıtım en fazla ${PROFILE_LIMITS.bio.max} karakter olabilir.`,
  acceptedTermsVersion: "Devam etmek için Kullanım Şartları'nı kabul etmelisin.",
};

export function profileFieldErrors(error: z.ZodError): ProfileFieldErrors {
  const result: ProfileFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in messages) result[field as ProfileField] = messages[field as ProfileField];
  }
  return result;
}
