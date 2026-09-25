"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { emailError } from "./validation";

export function PasswordResetForm() {
  const { auth } = useConnectors();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = emailError(email);
    setFieldError(error);
    if (error) return;
    setPending(true);
    setFormError(null);
    try {
      await auth.sendPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setFormError(toAppError(caught).message);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <Banner tone="success" title="İsteğini aldık" live>
          Bu e-posta adresiyle bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Gelen kutunu ve istenmeyen klasörünü
          kontrol et.
        </Banner>
        <Link href="/giris" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {formError && <Banner tone="danger" title={formError} live />}
      <TextField
        label="E-posta"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        error={fieldError}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </Button>
    </form>
  );
}
