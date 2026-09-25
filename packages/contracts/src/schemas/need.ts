import { z } from "zod";
import { isoDateTimeSchema, uidSchema, universityIdSchema, visibilitySchema } from "./common";
import { needMatchStatusSchema } from "./match";
import { boundedText, tagList } from "./text";

export const NEED_CATEGORIES = ["ders", "proje", "spor", "etkinlik", "ulasim", "esya", "yardim", "diger"] as const;

export const needCategorySchema = z.enum(NEED_CATEGORIES);

export type NeedCategory = z.infer<typeof needCategorySchema>;

export const NEED_CATEGORY_LABELS: Record<NeedCategory, string> = {
  ders: "Ders çalışma",
  proje: "Proje / takım",
  spor: "Spor",
  etkinlik: "Etkinlik",
  ulasim: "Yol arkadaşlığı",
  esya: "Eşya paylaşımı",
  yardim: "Yardım",
  diger: "Diğer",
};

export const NEED_WHEN_KINDS = ["none", "exact", "range", "flexible"] as const;

export const needWhenKindSchema = z.enum(NEED_WHEN_KINDS);

export type NeedWhenKind = z.infer<typeof needWhenKindSchema>;

export const NEED_LIMITS = {
  text: { min: 10, max: 1000 },
  title: { min: 3, max: 80 },
  tags: { max: 8, itemMax: 30 },
  participants: { min: 1, max: 50 },
  locationHint: { max: 80 },
  whenText: { max: 80 },
  clarifications: { max: 3, itemMax: 140 },
} as const;

export const NEED_DRAFT_TTL_HOURS = 24;

export const MASKED_PII_KINDS = ["phone", "email", "tckn", "iban"] as const;

export const maskedPiiKindSchema = z.enum(MASKED_PII_KINDS);

export type MaskedPiiKind = z.infer<typeof maskedPiiKindSchema>;

export const NEED_FAIL_REASONS = ["ai-error", "refusal", "quota", "budget"] as const;

export const needFailReasonSchema = z.enum(NEED_FAIL_REASONS);

export type NeedFailReason = z.infer<typeof needFailReasonSchema>;

export const needDraftIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Geçersiz taslak kimliği");

export const needWhenSchema = z
  .strictObject({
    kind: needWhenKindSchema,
    startIso: isoDateTimeSchema.nullable(),
    endIso: isoDateTimeSchema.nullable(),
    rawText: boundedText(1, NEED_LIMITS.whenText.max).nullable(),
  })
  .superRefine((when, context) => {
    const timed = when.kind === "exact" || when.kind === "range";
    if (timed && !when.startIso) {
      context.addIssue({ code: "custom", path: ["startIso"], message: "Başlangıç zamanı gerekli" });
    }
    if (when.kind === "range" && !when.endIso) {
      context.addIssue({ code: "custom", path: ["endIso"], message: "Bitiş zamanı gerekli" });
    }
    if (when.kind === "exact" && when.endIso) {
      context.addIssue({ code: "custom", path: ["endIso"], message: "Tek bir zaman için bitiş girilmez" });
    }
    if (!timed && (when.startIso || when.endIso)) {
      context.addIssue({ code: "custom", path: ["startIso"], message: "Bu zaman türünde tarih girilmez" });
    }
    if (when.startIso && when.endIso && Date.parse(when.endIso) < Date.parse(when.startIso)) {
      context.addIssue({ code: "custom", path: ["endIso"], message: "Bitiş başlangıçtan önce olamaz" });
    }
  });

export type NeedWhen = z.infer<typeof needWhenSchema>;

const participantCount = z.int().min(NEED_LIMITS.participants.min).max(NEED_LIMITS.participants.max);

export const needParticipantsSchema = z
  .strictObject({ min: participantCount, max: participantCount })
  .refine((value) => value.min <= value.max, { path: ["max"], message: "En fazla, en azdan küçük olamaz" });

export const parsedNeedSchema = z.strictObject({
  title: boundedText(NEED_LIMITS.title.min, NEED_LIMITS.title.max),
  category: needCategorySchema,
  tags: tagList(NEED_LIMITS.tags.max, NEED_LIMITS.tags.itemMax),
  requiredSkills: tagList(NEED_LIMITS.tags.max, NEED_LIMITS.tags.itemMax),
  participants: needParticipantsSchema,
  when: needWhenSchema,
  locationHint: boundedText(1, NEED_LIMITS.locationHint.max).nullable(),
});

export type ParsedNeed = z.output<typeof parsedNeedSchema>;

export type ParsedNeedInput = z.input<typeof parsedNeedSchema>;

export const storedParsedNeedSchema = z.object({
  title: z.string(),
  category: needCategorySchema,
  tags: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  participants: z.object({ min: z.int(), max: z.int() }),
  when: z.object({
    kind: needWhenKindSchema,
    startIso: isoDateTimeSchema.nullable(),
    endIso: isoDateTimeSchema.nullable(),
    rawText: z.string().nullable(),
  }),
  locationHint: z.string().nullable(),
});

export const needStatusSchema = z.enum(["open", "closed"]);

export const needParseStatusSchema = z.enum(["parsed", "failed"]);

export const needSchema = z.object({
  authorUid: uidSchema,
  universityId: universityIdSchema,
  visibility: visibilitySchema,
  rawText: z.string(),
  parsed: storedParsedNeedSchema,
  parseStatus: needParseStatusSchema,
  edited: z.boolean(),
  status: needStatusSchema,
  matchStatus: needMatchStatusSchema.optional(),
  matchCount: z.int().min(0).optional(),
  createdAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema.nullable(),
});

export type Need = z.infer<typeof needSchema>;

export const parseNeedRequestSchema = z.strictObject({
  draftId: needDraftIdSchema,
  text: z.string().trim().min(NEED_LIMITS.text.min).max(NEED_LIMITS.text.max),
});

export const parseNeedResponseSchema = z.strictObject({
  draftId: needDraftIdSchema,
  status: needParseStatusSchema,
  failReason: needFailReasonSchema.nullable(),
  parsed: storedParsedNeedSchema,
  confidence: z.number().min(0).max(1).nullable(),
  clarifications: z.array(z.string()).max(NEED_LIMITS.clarifications.max),
  maskedKinds: z.array(maskedPiiKindSchema),
  maskedText: z.string(),
  publishable: z.boolean(),
});

export type ParseNeedResponse = z.output<typeof parseNeedResponseSchema>;

export const publishNeedRequestSchema = z.strictObject({
  draftId: needDraftIdSchema,
  visibility: visibilitySchema,
  need: parsedNeedSchema,
});

export type PublishNeedRequest = z.input<typeof publishNeedRequestSchema>;

export const publishNeedResponseSchema = z.strictObject({
  needId: needDraftIdSchema,
});
