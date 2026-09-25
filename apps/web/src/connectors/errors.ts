import { appErrorCodeSchema, callableErrorDetailsSchema, type AppErrorCode } from "@kampusagi/contracts";

const messages: Record<AppErrorCode, string> = {
  unauthenticated: "Devam etmek için oturum açmalısın.",
  "permission-denied": "Bu işlem için yetkin yok.",
  "not-verified": "Bu bölüm, öğrenci doğrulaman tamamlandığında açılacak.",
  "invalid-argument": "Gönderilen bilgiler geçersiz. Lütfen kontrol edip tekrar dene.",
  "not-found": "Aradığın içerik bulunamadı.",
  "already-exists": "Bu kayıt zaten mevcut.",
  "failed-precondition": "Bu işlem şu anda yapılamıyor.",
  "resource-exhausted": "Çok fazla deneme yaptın. Lütfen biraz bekleyip tekrar dene.",
  unavailable: "Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.",
  "deadline-exceeded": "İşlem zaman aşımına uğradı. Lütfen tekrar dene.",
  cancelled: "İşlem iptal edildi.",
  internal: "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.",
  unknown: "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.",
};

const specific: Record<string, { code: AppErrorCode; message?: string }> = {
  "auth/invalid-credential": { code: "invalid-argument", message: "E-posta veya şifre hatalı." },
  "auth/wrong-password": { code: "invalid-argument", message: "E-posta veya şifre hatalı." },
  "auth/user-not-found": { code: "invalid-argument", message: "E-posta veya şifre hatalı." },
  "auth/invalid-email": { code: "invalid-argument", message: "Geçerli bir e-posta adresi gir." },
  "auth/weak-password": { code: "invalid-argument", message: "Şifre yeterince güçlü değil." },
  "auth/email-already-in-use": { code: "already-exists", message: "Bu e-posta adresiyle zaten bir hesap var." },
  "auth/too-many-requests": { code: "resource-exhausted" },
  "auth/network-request-failed": { code: "unavailable" },
  "auth/user-disabled": { code: "permission-denied", message: "Bu hesap devre dışı bırakılmış." },
  "auth/requires-recent-login": {
    code: "failed-precondition",
    message: "Güvenliğin için lütfen yeniden oturum açıp tekrar dene.",
  },
  "auth/popup-closed-by-user": { code: "cancelled" },
  "storage/unauthenticated": { code: "unauthenticated" },
  "storage/unauthorized": { code: "permission-denied" },
  "storage/canceled": { code: "cancelled" },
  "storage/object-not-found": { code: "not-found" },
  "storage/quota-exceeded": { code: "resource-exhausted" },
  "storage/retry-limit-exceeded": { code: "unavailable" },
};

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message = messages[code], options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
  }
}

function errorCodeOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

function detailsCodeOf(error: unknown): AppErrorCode | undefined {
  if (typeof error !== "object" || error === null || !("details" in error)) return undefined;
  const parsed = callableErrorDetailsSchema.safeParse(error.details);
  return parsed.success ? parsed.data.appCode : undefined;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const detailsCode = detailsCodeOf(error);
  if (detailsCode) return new AppError(detailsCode, undefined, { cause: error });
  const rawCode = errorCodeOf(error);
  if (rawCode) {
    const known = specific[rawCode];
    if (known) return new AppError(known.code, known.message, { cause: error });
    const bare = appErrorCodeSchema.safeParse(rawCode.replace(/^functions\//, ""));
    if (bare.success) return new AppError(bare.data, undefined, { cause: error });
  }
  return new AppError("unknown", undefined, { cause: error });
}
