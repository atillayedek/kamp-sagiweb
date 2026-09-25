import type { z } from "zod";
import { pingRequestSchema, pingResponseSchema } from "./schemas/ping";
import {
  completeOnboardingRequestSchema,
  completeOnboardingResponseSchema,
  updateProfileRequestSchema,
  updateProfileResponseSchema,
} from "./schemas/profile";

export const CONTRACT_VERSION = 1;

export const callables = {
  ping: {
    name: "v1-ping",
    request: pingRequestSchema,
    response: pingResponseSchema,
  },
  completeOnboarding: {
    name: "v1-completeOnboarding",
    request: completeOnboardingRequestSchema,
    response: completeOnboardingResponseSchema,
  },
  updateProfile: {
    name: "v1-updateProfile",
    request: updateProfileRequestSchema,
    response: updateProfileResponseSchema,
  },
} as const;

export type CallableKey = keyof typeof callables;

export type CallableRequest<K extends CallableKey> = z.input<(typeof callables)[K]["request"]>;

export type CallableResponse<K extends CallableKey> = z.output<(typeof callables)[K]["response"]>;
