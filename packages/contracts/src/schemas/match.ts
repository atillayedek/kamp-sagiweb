import { z } from "zod";
import { isoDateTimeSchema, uidSchema } from "./common";

export const MATCH_COMPONENTS = ["campus", "category", "tags", "skills", "department", "reliability"] as const;

export type MatchComponent = (typeof MATCH_COMPONENTS)[number];

export const matchBreakdownSchema = z.object({
  campus: z.number().nullable(),
  category: z.number().nullable(),
  tags: z.number().nullable(),
  skills: z.number().nullable(),
  department: z.number().nullable(),
  reliability: z.number().nullable(),
});

export type MatchBreakdown = z.infer<typeof matchBreakdownSchema>;

export const matchStatusSchema = z.enum(["suggested", "dismissed"]);

export const matchSchema = z.object({
  candidateUid: uidSchema,
  needId: z.string(),
  needAuthorUid: uidSchema,
  score: z.number().min(0).max(100),
  breakdown: matchBreakdownSchema,
  reasons: z.array(z.string()),
  weightsVersion: z.string(),
  status: matchStatusSchema,
  createdAt: isoDateTimeSchema.nullable(),
});

export type Match = z.infer<typeof matchSchema>;

export const needMatchStatusSchema = z.enum(["pending", "done", "failed"]);
