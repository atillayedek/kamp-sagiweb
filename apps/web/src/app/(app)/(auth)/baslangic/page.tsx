import type { Metadata } from "next";
import { OnboardingGate } from "./OnboardingGate";

export const metadata: Metadata = { title: "Profilini oluştur" };

export default function OnboardingPage() {
  return <OnboardingGate />;
}
