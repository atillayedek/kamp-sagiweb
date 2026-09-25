import type { RejectReason } from "@kampusagi/contracts";

export const rejectReasonLabels: Record<RejectReason, string> = {
  unreadable: "Belge okunamıyor",
  "not-student-document": "Öğrenci belgesi değil",
  expired: "Belge güncel değil",
  "university-mismatch": "Üniversite profille eşleşmiyor",
  other: "Diğer",
};
