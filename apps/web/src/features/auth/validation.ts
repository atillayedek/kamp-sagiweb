import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

const emailSchema = z.email();

export function emailError(email: string): string | undefined {
  return emailSchema.safeParse(email.trim()).success ? undefined : "Geçerli bir e-posta adresi gir.";
}

export function passwordError(password: string): string | undefined {
  return password.length >= MIN_PASSWORD_LENGTH ? undefined : `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
}
