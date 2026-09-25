import {
  createClubCallable,
  createEventCallable,
  deleteCommentCallable,
  deletePostCallable,
  reportContentCallable,
} from "./callables/community";
import { parseNeedCallable, publishNeedCallable } from "./callables/needs";
import { ping } from "./callables/ping";
import { completeOnboarding, updateProfile } from "./callables/profile";
import {
  reviewVerificationCallable,
  submitVerificationCallable,
  syncVerificationClaimsCallable,
} from "./callables/verification";
import { countClubMembers, countEventAttendees, countPostComments, countPostLikes } from "./community/trigger";
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
  createClub: createClubCallable,
  createEvent: createEventCallable,
  deletePost: deletePostCallable,
  deleteComment: deleteCommentCallable,
  reportContent: reportContentCallable,
};

export const jobs = { purgeVerificationFiles, purgeExpiredRecords };

export const triggers = {
  matchOnNeedCreated,
  notifyOnInterest,
  withdrawOnInterestDeleted,
  countPostLikes,
  countPostComments,
  countClubMembers,
  countEventAttendees,
};
