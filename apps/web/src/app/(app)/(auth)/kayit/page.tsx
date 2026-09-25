import type { Metadata } from "next";
import { RedirectIfSignedIn } from "@/features/app/guards";
import { AuthCard } from "@/features/auth/AuthCard";
import { SignUpForm } from "@/features/auth/SignUpForm";

export const metadata: Metadata = { title: "Kayıt ol" };

export default function SignUpPage() {
  return (
    <RedirectIfSignedIn toOnboarding>
      <AuthCard
        title="Hesap oluştur"
        description="Hesabını oluşturduktan sonra profilini dolduracak ve öğrenci belgeni yükleyeceksin."
      >
        <SignUpForm />
      </AuthCard>
    </RedirectIfSignedIn>
  );
}
