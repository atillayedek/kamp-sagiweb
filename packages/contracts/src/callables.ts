import type { z } from "zod";
import { pingRequestSchema, pingResponseSchema } from "./schemas/ping";

export const CONTRACT_VERSION = 1;

export const callables = {
  ping: {
    name: "v1-ping",
    request: pingRequestSchema,
    response: pingResponseSchema,
  },
} as const;

export type CallableKey = keyof typeof callables;

export type CallableRequest<K extends CallableKey> = z.input<(typeof callables)[K]["request"]>;

export type CallableResponse<K extends CallableKey> = z.output<(typeof callables)[K]["response"]>;
