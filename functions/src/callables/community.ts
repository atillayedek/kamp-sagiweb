import { clubDailyCreates, eventDailyCreates, reportDailyLimit } from "../config";
import { reportContent } from "../community/reports";
import { createClub, createEvent, deleteComment, deletePost, type CommunityDeps } from "../community/service";
import { verifiedActor } from "../lib/access";
import { db } from "../lib/admin";
import { defineCallable } from "../lib/callable";

function deps(): CommunityDeps {
  return {
    firestore: db(),
    limits: { dailyClubs: clubDailyCreates.value(), dailyEvents: eventDailyCreates.value(), dailyReports: reportDailyLimit.value() },
  };
}

export const createClubCallable = defineCallable("createClub", {
  access: "verified",
  handler: (input, caller) => createClub(deps(), verifiedActor(caller), input),
});

export const createEventCallable = defineCallable("createEvent", {
  access: "verified",
  handler: (input, caller) => createEvent(deps(), verifiedActor(caller), input),
});

export const deletePostCallable = defineCallable("deletePost", {
  access: "signed-in",
  handler: (input, caller) => deletePost({ firestore: db() }, caller.uid, input),
});

export const deleteCommentCallable = defineCallable("deleteComment", {
  access: "signed-in",
  handler: (input, caller) => deleteComment({ firestore: db() }, caller.uid, input),
});

export const reportContentCallable = defineCallable("reportContent", {
  access: "verified",
  handler: (input, caller) =>
    reportContent({ firestore: db(), dailyReports: reportDailyLimit.value() }, verifiedActor(caller), input),
});
