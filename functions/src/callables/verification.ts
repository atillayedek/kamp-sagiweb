import { adminAuth, db, defaultBucket } from "../lib/admin";
import { defineCallable } from "../lib/callable";
import { reviewVerification, submitVerification, syncVerificationClaims } from "../verification/service";

export const submitVerificationCallable = defineCallable("submitVerification", {
  access: "signed-in",
  handler: (input, caller) => submitVerification({ firestore: db(), bucket: defaultBucket() }, caller.uid, input.requestId),
});

export const reviewVerificationCallable = defineCallable("reviewVerification", {
  access: "moderator",
  handler: (input, caller) => reviewVerification({ firestore: db(), auth: adminAuth() }, caller.uid, input),
});

export const syncVerificationClaimsCallable = defineCallable("syncVerificationClaims", {
  access: "signed-in",
  handler: (_input, caller) => syncVerificationClaims({ firestore: db(), auth: adminAuth() }, caller.uid),
});
