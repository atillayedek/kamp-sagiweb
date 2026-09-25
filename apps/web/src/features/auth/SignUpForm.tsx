"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { RequiredNote } from "@/components/ui/RequiredNote";
import { TextField } from "@/components/ui/TextField";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { emailError, MIN_PASSWORD_LENGTH, passwordError } from "./validation";

type Errors = { email?: string; password?: string; confirm?: string };

export function SignUpForm() {
  const { auth } = useConnectors();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const signInHref = next ? `/giris?next=${encodeURIComponent(next)}` : "/giris";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Errors = {
      email: emailError(email),
      password: passwordError(password),
      confirm: confirm === password ? undefined : "Şifreler eşleşmiyor.",
    };
    setFieldErrors(errors);
    if (errors.email || errors.password || errors.confirm) return;
    setPending(true);
    setFormError(null);
    try {
      await auth.signUpWithEmail(email, password);
    } catch (error) {
      setFormError(toAppError(error).message);
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      {formError && <Banner tone="danger" title={formError} live />}
      <RequiredNote />
      <TextField
        label="E-posta"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        error={fieldErrors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Şifre"
        type="password"
        autoComplete="new-password"
        hint={`En az ${MIN_PASSWORD_LENGTH} karakter.`}
        required
        value={password}
        error={fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <TextField
        label="Şifre (tekrar)"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        error={fieldErrors.confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
      </Button>
      <p className="text-center text-sm">
        <Link href={signInHref} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Zaten hesabın var mı? Giriş yap
        </Link>
      </p>
    </form>
  );
}
