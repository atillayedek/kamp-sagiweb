import { z } from "zod";
import { isoDateTimeSchema } from "./common";

export const pingRequestSchema = z.strictObject({});

export const pingResponseSchema = z.strictObject({
  ok: z.literal(true),
  serverTime: isoDateTimeSchema,
  contractVersion: z.number().int().positive(),
});

export type PingResponse = z.infer<typeof pingResponseSchema>;
