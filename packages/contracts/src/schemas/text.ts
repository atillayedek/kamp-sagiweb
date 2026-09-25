import { z } from "zod";

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function boundedText(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !CONTROL_CHARS.test(value), "Kontrol karakteri içeremez");
}

export function tagList(max: number, itemMax = 30) {
  return z
    .array(boundedText(1, itemMax).transform((value) => value.toLocaleLowerCase("tr-TR")))
    .max(max)
    .transform((values) => [...new Set(values)]);
}
