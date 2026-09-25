import { z } from "zod";
import { isoDateTimeSchema, uidSchema, universityIdSchema } from "./common";

export const VERIFICATION_MAX_BYTES = 5 * 1024 * 1024;

export const VERIFICATION_RETENTION_DAYS = 30;

export const verificationRequestIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Geçersiz istek kimliği");

export function verificationStoragePath(uid: string, requestId: string): string {
  return `verification/${uid}/${requestId}.pdf`;
}

export const REJECT_REASONS = ["unreadable", "not-student-document", "expired", "university-mismatch", "other"] as const;

export const rejectReasonSchema = z.enum(REJECT_REASONS);

export type RejectReason = z.infer<typeof rejectReasonSchema>;

export const verificationRequestStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const verificationRequestSchema = z.object({
  uid: uidSchema,
  universityId: universityIdSchema,
  storagePath: z.string(),
  status: verificationRequestStatusSchema,
  rejectReason: rejectReasonSchema.nullable(),
  note: z.string().nullable(),
  reviewedBy: uidSchema.nullable(),
  reviewedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema.nullable(),
  purgeAt: isoDateTimeSchema.nullable().optional(),
  fileDeletedAt: isoDateTimeSchema.nullable().optional(),
});

export type VerificationRequest = z.infer<typeof verificationRequestSchema>;

export const privateVerificationSchema = z.object({
  requestId: verificationRequestIdSchema,
  status: verificationRequestStatusSchema,
  rejectReason: rejectReasonSchema.nullable(),
  note: z.string().nullable(),
  updatedAt: isoDateTimeSchema.nullable(),
});

export const userPrivateSchema = z.object({
  verification: privateVerificationSchema.optional(),
});

export type PrivateVerification = z.infer<typeof privateVerificationSchema>;

export const submitVerificationRequestSchema = z.strictObject({
  requestId: verificationRequestIdSchema,
});

export const submitVerificationResponseSchema = z.strictObject({
  status: z.literal("pending"),
});

export const reviewVerificationRequestSchema = z
  .strictObject({
    requestId: verificationRequestIdSchema,
    decision: z.enum(["approve", "reject"]),
    rejectReason: rejectReasonSchema.optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((value) => value.decision === "approve" || value.rejectReason !== undefined, {
    message: "Red için sebep zorunlu",
    path: ["rejectReason"],
  });

export const reviewVerificationResponseSchema = z.strictObject({
  status: z.enum(["approved", "rejected"]),
});

export const moderationLogSchema = z.object({
  action: z.enum(["verification.approve", "verification.reject"]),
  actorUid: uidSchema,
  targetUid: uidSchema,
  targetRef: z.string(),
  reason: z.string().nullable(),
  createdAt: isoDateTimeSchema.nullable(),
});

export const syncVerificationClaimsRequestSchema = z.strictObject({});

export const syncVerificationClaimsResponseSchema = z.strictObject({
  verified: z.boolean(),
});
