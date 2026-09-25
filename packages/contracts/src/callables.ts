import type { z } from "zod";
import { pingRequestSchema, pingResponseSchema } from "./schemas/ping";
import {
  completeOnboardingRequestSchema,
  completeOnboardingResponseSchema,
  updateProfileRequestSchema,
  updateProfileResponseSchema,
} from "./schemas/profile";
import {
  reviewVerificationRequestSchema,
  reviewVerificationResponseSchema,
  submitVerificationRequestSchema,
  submitVerificationResponseSchema,
  syncVerificationClaimsRequestSchema,
  syncVerificationClaimsResponseSchema,
} from "./schemas/verification";

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
  submitVerification: {
    name: "v1-submitVerification",
    request: submitVerificationRequestSchema,
    response: submitVerificationResponseSchema,
  },
  reviewVerification: {
    name: "v1-reviewVerification",
    request: reviewVerificationRequestSchema,
    response: reviewVerificationResponseSchema,
  },
  syncVerificationClaims: {
    name: "v1-syncVerificationClaims",
    request: syncVerificationClaimsRequestSchema,
    response: syncVerificationClaimsResponseSchema,
  },
} as const;

export type CallableKey = keyof typeof callables;

export type CallableRequest<K extends CallableKey> = z.input<(typeof callables)[K]["request"]>;

export type CallableResponse<K extends CallableKey> = z.output<(typeof callables)[K]["response"]>;
