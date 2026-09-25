"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { emailError } from "./validation";

export function SignInForm() {
  const { auth } = useConnectors();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = { email: emailError(email), password: password ? undefined : "Şifreni gir." };
    setFieldErrors(errors);
    if (errors.email || errors.password) return;
    setPending(true);
    setFormError(null);
    try {
      await auth.signInWithEmail(email, password);
    } catch (error) {
      setFormError(toAppError(error).message);
      setPending(false);
    }
  }

  const next = searchParams.get("next");
  const signUpHref = next ? `/kayit?next=${encodeURIComponent(next)}` : "/kayit";

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
        error={fieldErrors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Şifre"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        error={fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
      <div className="flex flex-col items-center gap-1 text-sm sm:flex-row sm:justify-between">
        <Link href="/sifre-sifirla" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Şifreni mi unuttun?
        </Link>
        <Link href={signUpHref} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Hesabın yok mu? Kayıt ol
        </Link>
      </div>
    </form>
  );
}
