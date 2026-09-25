import { parseNeedCallable, publishNeedCallable } from "./callables/needs";
import { ping } from "./callables/ping";
import { completeOnboarding, updateProfile } from "./callables/profile";
import {
  reviewVerificationCallable,
  submitVerificationCallable,
  syncVerificationClaimsCallable,
} from "./callables/verification";
import { purgeExpiredRecords, purgeVerificationFiles } from "./jobs/purge";
import { notifyOnInterest, withdrawOnInterestDeleted } from "./interests/trigger";
import { matchOnNeedCreated } from "./matching/trigger";

export const v1 = {
  ping,
  completeOnboarding,
  updateProfile,
  submitVerification: submitVerificationCallable,
  reviewVerification: reviewVerificationCallable,
  syncVerificationClaims: syncVerificationClaimsCallable,
  parseNeed: parseNeedCallable,
  publishNeed: publishNeedCallable,
};

export const jobs = { purgeVerificationFiles, purgeExpiredRecords };

export const triggers = { matchOnNeedCreated, notifyOnInterest, withdrawOnInterestDeleted };
