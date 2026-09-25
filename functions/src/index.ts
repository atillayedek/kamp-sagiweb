import { ping } from "./callables/ping";
import { completeOnboarding, updateProfile } from "./callables/profile";
import {
  reviewVerificationCallable,
  submitVerificationCallable,
  syncVerificationClaimsCallable,
} from "./callables/verification";
import { purgeVerificationFiles } from "./jobs/purge";

export const v1 = {
  ping,
  completeOnboarding,
  updateProfile,
  submitVerification: submitVerificationCallable,
  reviewVerification: reviewVerificationCallable,
  syncVerificationClaims: syncVerificationClaimsCallable,
};

export const jobs = { purgeVerificationFiles };
