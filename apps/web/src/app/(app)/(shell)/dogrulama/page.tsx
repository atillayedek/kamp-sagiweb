import type { Metadata } from "next";
import { VerificationPage } from "@/features/verification/VerificationPage";

export const metadata: Metadata = { title: "Öğrenci doğrulaması" };

export default function Page() {
  return <VerificationPage />;
}
