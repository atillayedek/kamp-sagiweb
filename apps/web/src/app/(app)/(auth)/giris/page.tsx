import type { Metadata } from "next";
import { RedirectIfSignedIn } from "@/features/app/guards";
import { AuthCard } from "@/features/auth/AuthCard";
import { SignInForm } from "@/features/auth/SignInForm";

export const metadata: Metadata = { title: "Giriş yap" };

export default function SignInPage() {
  return (
    <RedirectIfSignedIn>
      <AuthCard title="Giriş yap" description="KampüsAğı hesabınla devam et.">
        <SignInForm />
      </AuthCard>
    </RedirectIfSignedIn>
  );
}
