import { z } from "zod";

export const APP_ERROR_CODES = [
  "unauthenticated",
  "permission-denied",
  "not-verified",
  "invalid-argument",
  "not-found",
  "already-exists",
  "failed-precondition",
  "resource-exhausted",
  "unavailable",
  "deadline-exceeded",
  "cancelled",
  "internal",
  "unknown",
] as const;

export const appErrorCodeSchema = z.enum(APP_ERROR_CODES);

export type AppErrorCode = z.infer<typeof appErrorCodeSchema>;

export const callableErrorDetailsSchema = z.object({
  appCode: appErrorCodeSchema,
});

export type CallableErrorDetails = z.infer<typeof callableErrorDetailsSchema>;
