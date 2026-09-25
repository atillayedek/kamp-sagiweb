import type { AppErrorCode } from "@kampusagi/contracts";
import { HttpsError, type FunctionsErrorCode } from "firebase-functions/v2/https";

const httpsCodeFor: Record<AppErrorCode, FunctionsErrorCode> = {
  unauthenticated: "unauthenticated",
  "permission-denied": "permission-denied",
  "not-verified": "permission-denied",
  "invalid-argument": "invalid-argument",
  "not-found": "not-found",
  "already-exists": "already-exists",
  "failed-precondition": "failed-precondition",
  "resource-exhausted": "resource-exhausted",
  unavailable: "unavailable",
  "deadline-exceeded": "deadline-exceeded",
  cancelled: "cancelled",
  internal: "internal",
  unknown: "unknown",
};

export function appError(appCode: AppErrorCode, message: string): HttpsError {
  return new HttpsError(httpsCodeFor[appCode], message, { appCode });
}
