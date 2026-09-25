import { z } from "zod";
import { isoDateTimeSchema, universityIdSchema } from "./common";
import { boundedText as text, tagList } from "./text";

export const PROFILE_LIMITS = {
  displayName: { min: 2, max: 40 },
  department: { min: 2, max: 80 },
  bio: { max: 280 },
  tags: { max: 10 },
} as const;

export const LEGAL_TERMS_VERSION = "2026-09-taslak";

export const displayNameSchema = text(PROFILE_LIMITS.displayName.min, PROFILE_LIMITS.displayName.max);
export const departmentSchema = text(PROFILE_LIMITS.department.min, PROFILE_LIMITS.department.max);
export const bioSchema = text(0, PROFILE_LIMITS.bio.max);
export const interestsSchema = tagList(PROFILE_LIMITS.tags.max);
export const skillsSchema = tagList(PROFILE_LIMITS.tags.max);

export const verificationStatusSchema = z.enum(["unverified", "pending", "verified", "rejected"]);

export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const editableProfileSchema = z.strictObject({
  displayName: displayNameSchema,
  department: departmentSchema,
  interests: interestsSchema,
  skills: skillsSchema,
  bio: bioSchema,
});

export type EditableProfile = z.infer<typeof editableProfileSchema>;

export const publicProfileSchema = z.object({
  displayName: z.string(),
  universityId: universityIdSchema,
  department: z.string(),
  interests: z.array(z.string()),
  skills: z.array(z.string()),
  bio: z.string(),
  verificationStatus: verificationStatusSchema,
  reputationScore: z.number().nullable(),
  createdAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema.nullable(),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const universitySchema = z.object({
  name: z.string(),
  city: z.string(),
});

export type University = z.infer<typeof universitySchema>;

export const completeOnboardingRequestSchema = editableProfileSchema.extend({
  universityId: universityIdSchema,
  acceptedTermsVersion: z.literal(LEGAL_TERMS_VERSION),
});

export type CompleteOnboardingRequest = z.input<typeof completeOnboardingRequestSchema>;

export const completeOnboardingResponseSchema = z.strictObject({
  created: z.boolean(),
});

export const updateProfileRequestSchema = editableProfileSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "En az bir alan güncellenmeli");

export const updateProfileResponseSchema = z.strictObject({
  updated: z.literal(true),
});
