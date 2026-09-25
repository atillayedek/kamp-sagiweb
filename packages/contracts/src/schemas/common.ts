import { z } from "zod";

export const uidSchema = z.string().min(1).max(128);

export const universityIdSchema = z.string().regex(/^[a-z0-9-]{2,64}$/, "Geçersiz üniversite kimliği");

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const customClaimsSchema = z.object({
  moderator: z.boolean().optional(),
  verified: z.boolean().optional(),
  universityId: universityIdSchema.optional(),
});

export type CustomClaims = z.infer<typeof customClaimsSchema>;
