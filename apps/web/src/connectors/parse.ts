import type { z } from "zod";
import { AppError } from "./errors";

export function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown, context: string): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError("internal", undefined, { cause: new Error(`Sözleşme dışı veri: ${context}`) });
  }
  return result.data;
}
