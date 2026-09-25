import type { Metadata } from "next";
import { RedirectIfSignedIn } from "@/features/app/guards";
import { AuthCard } from "@/features/auth/AuthCard";
import { PasswordResetForm } from "@/features/auth/PasswordResetForm";

export const metadata: Metadata = { title: "Şifre sıfırla" };

export default function PasswordResetPage() {
  return (
    <RedirectIfSignedIn>
      <AuthCard title="Şifreni sıfırla" description="Hesabının e-posta adresini yaz; sıfırlama bağlantısı gönderelim.">
        <PasswordResetForm />
      </AuthCard>
    </RedirectIfSignedIn>
  );
}
