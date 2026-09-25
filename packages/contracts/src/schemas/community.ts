import { z } from "zod";
import { isoDateTimeSchema, uidSchema, universityIdSchema, visibilitySchema } from "./common";
import { boundedText, multilineText } from "./text";

export const COMMUNITY_LIMITS = {
  post: { min: 1, max: 1000 },
  comment: { min: 1, max: 500 },
  clubName: { min: 3, max: 60 },
  clubDescription: { min: 10, max: 500 },
  eventTitle: { min: 3, max: 80 },
  eventDescription: { min: 0, max: 1000 },
  eventLocation: { min: 2, max: 80 },
  eventMinLeadMinutes: 15,
  eventMaxAheadDays: 180,
  eventMaxDurationHours: 72,
  reportDetails: { max: 500 },
} as const;

export const documentIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "Geçersiz belge kimliği");

export const clientIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Geçersiz kimlik");

const count = z.int();

export const postTextSchema = multilineText(COMMUNITY_LIMITS.post.min, COMMUNITY_LIMITS.post.max);

export const commentTextSchema = multilineText(COMMUNITY_LIMITS.comment.min, COMMUNITY_LIMITS.comment.max);

export const postSchema = z.object({
  authorUid: uidSchema,
  universityId: universityIdSchema,
  visibility: visibilitySchema,
  text: z.string(),
  likeCount: count,
  commentCount: count,
  createdAt: isoDateTimeSchema.nullable(),
});

export type Post = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  authorUid: uidSchema,
  authorUniversityId: universityIdSchema,
  text: z.string(),
  createdAt: isoDateTimeSchema.nullable(),
});

export type Comment = z.infer<typeof commentSchema>;

export const clubSchema = z.object({
  name: z.string(),
  description: z.string(),
  universityId: universityIdSchema,
  visibility: visibilitySchema,
  founderUid: uidSchema,
  memberCount: count,
  createdAt: isoDateTimeSchema.nullable(),
});

export type Club = z.infer<typeof clubSchema>;

export const eventSchema = z.object({
  title: z.string(),
  description: z.string(),
  location: z.string(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.nullable(),
  universityId: universityIdSchema,
  visibility: visibilitySchema,
  organizerUid: uidSchema,
  attendeeCount: count,
  createdAt: isoDateTimeSchema.nullable(),
});

export type CampusEvent = z.infer<typeof eventSchema>;

export const createClubRequestSchema = z.strictObject({
  clubId: clientIdSchema,
  name: boundedText(COMMUNITY_LIMITS.clubName.min, COMMUNITY_LIMITS.clubName.max).refine(
    (value) => (value.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2,
    "Kulüp adı en az iki harf veya rakam içermeli",
  ),
  description: multilineText(COMMUNITY_LIMITS.clubDescription.min, COMMUNITY_LIMITS.clubDescription.max),
  visibility: visibilitySchema,
});

export type CreateClubRequest = z.input<typeof createClubRequestSchema>;

export const createClubResponseSchema = z.strictObject({ clubId: clientIdSchema });

export const createEventRequestSchema = z
  .strictObject({
    eventId: clientIdSchema,
    title: boundedText(COMMUNITY_LIMITS.eventTitle.min, COMMUNITY_LIMITS.eventTitle.max),
    description: multilineText(COMMUNITY_LIMITS.eventDescription.min, COMMUNITY_LIMITS.eventDescription.max),
    location: boundedText(COMMUNITY_LIMITS.eventLocation.min, COMMUNITY_LIMITS.eventLocation.max),
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema.nullable(),
    visibility: visibilitySchema,
  })
  .superRefine((value, context) => {
    if (!value.endsAt) return;
    const start = Date.parse(value.startsAt);
    const end = Date.parse(value.endsAt);
    if (end <= start) {
      context.addIssue({ code: "custom", path: ["endsAt"], message: "Bitiş başlangıçtan sonra olmalı" });
    } else if (end - start > COMMUNITY_LIMITS.eventMaxDurationHours * 60 * 60 * 1000) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: `Etkinlik en fazla ${COMMUNITY_LIMITS.eventMaxDurationHours} saat sürebilir`,
      });
    }
  });

export type CreateEventRequest = z.input<typeof createEventRequestSchema>;

export const createEventResponseSchema = z.strictObject({ eventId: clientIdSchema });

export const deletePostRequestSchema = z.strictObject({ postId: documentIdSchema });

export const deleteCommentRequestSchema = z.strictObject({ postId: documentIdSchema, commentId: documentIdSchema });

export const deleteResponseSchema = z.strictObject({ status: z.enum(["deleted", "missing"]) });

export const REPORT_TARGET_TYPES = ["post", "comment", "club", "event", "need"] as const;

export const reportTargetTypeSchema = z.enum(REPORT_TARGET_TYPES);

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  post: "Gönderi",
  comment: "Yorum",
  club: "Kulüp",
  event: "Etkinlik",
  need: "İlan",
};

export const reportTargetSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("post"), postId: documentIdSchema }),
  z.strictObject({ type: z.literal("comment"), postId: documentIdSchema, commentId: documentIdSchema }),
  z.strictObject({ type: z.literal("club"), clubId: documentIdSchema }),
  z.strictObject({ type: z.literal("event"), eventId: documentIdSchema }),
  z.strictObject({ type: z.literal("need"), needId: documentIdSchema }),
]);

export type ReportTarget = z.infer<typeof reportTargetSchema>;

export function reportTargetPath(target: ReportTarget): string {
  switch (target.type) {
    case "post":
      return `posts/${target.postId}`;
    case "comment":
      return `posts/${target.postId}/comments/${target.commentId}`;
    case "club":
      return `clubs/${target.clubId}`;
    case "event":
      return `events/${target.eventId}`;
    case "need":
      return `needs/${target.needId}`;
  }
}

export const REPORT_REASONS = ["spam", "harassment", "hate", "sexual", "violence", "personal-info", "fake", "other"] as const;

export const reportReasonSchema = z.enum(REPORT_REASONS);

export type ReportReason = z.infer<typeof reportReasonSchema>;

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam veya reklam",
  harassment: "Taciz veya zorbalık",
  hate: "Nefret söylemi veya ayrımcılık",
  sexual: "Cinsel içerik",
  violence: "Şiddet veya tehdit",
  "personal-info": "Kişisel bilgi paylaşımı",
  fake: "Sahte veya yanıltıcı içerik",
  other: "Diğer",
};

export const reportContentRequestSchema = z
  .strictObject({
    target: reportTargetSchema,
    reason: reportReasonSchema,
    details: multilineText(0, COMMUNITY_LIMITS.reportDetails.max),
  })
  .refine((value) => value.reason !== "other" || value.details.length >= 5, {
    path: ["details"],
    message: "“Diğer” için kısa bir açıklama yaz",
  });

export type ReportContentRequest = z.input<typeof reportContentRequestSchema>;

export const reportContentResponseSchema = z.strictObject({
  reportId: z.string().regex(/^[a-f0-9]{40}$/),
  status: z.enum(["created", "duplicate"]),
});

export const reportStatusSchema = z.enum(["open", "resolved", "dismissed"]);

export const reportSnapshotSchema = z.object({
  title: z.string().nullable(),
  text: z.string(),
  visibility: visibilitySchema.nullable(),
  createdAt: isoDateTimeSchema.nullable(),
});

export type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;

export const reportSchema = z.object({
  reporterUid: uidSchema,
  reporterUniversityId: universityIdSchema,
  targetType: reportTargetTypeSchema,
  targetPath: z.string(),
  targetKey: z.string(),
  targetOwnerUid: uidSchema,
  targetUniversityId: universityIdSchema,
  reason: reportReasonSchema,
  details: z.string(),
  snapshot: reportSnapshotSchema,
  status: reportStatusSchema,
  createdAt: isoDateTimeSchema.nullable(),
});

export type Report = z.infer<typeof reportSchema>;
