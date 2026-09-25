import { customClaimsSchema, type CustomClaims } from "@kampusagi/contracts";
import type { z } from "zod";
import { appError } from "./errors";

export type Access = "signed-in" | "verified" | "moderator";

export type Caller = {
  uid: string;
  claims: CustomClaims;
};

type AuthLike = { uid: string; token: Record<string, unknown> } | undefined;

export function resolveCaller(auth: AuthLike, access: Access): Caller {
  if (!auth) throw appError("unauthenticated", "Bu işlem için oturum açmalısın.");
  const parsed = customClaimsSchema.safeParse({
    moderator: auth.token.moderator,
    verified: auth.token.verified,
    universityId: auth.token.universityId,
  });
  const claims: CustomClaims = parsed.success ? parsed.data : {};
  if (access === "moderator" && claims.moderator !== true) {
    throw appError("permission-denied", "Bu işlem için yetkin yok.");
  }
  if (access === "verified" && (claims.verified !== true || !claims.universityId)) {
    throw appError("not-verified", "Bu işlem için öğrenci doğrulamanın tamamlanması gerekiyor.");
  }
  return { uid: auth.uid, claims };
}

export function parseRequest<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw appError("invalid-argument", "İstek geçersiz.");
  return result.data;
}
