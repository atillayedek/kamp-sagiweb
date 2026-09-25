import { createAnthropicMessages, createAnthropicNeedExtractor } from "../ai/anthropic";
import { createFakeNeedExtractor } from "../ai/fake";
import type { NeedExtractor } from "../ai/types";
import {
  aiDailyTokenBudget,
  aiDailyUserParses,
  aiModel,
  anthropicApiKey,
  needDailyDrafts,
  needDailyPublishes,
} from "../config";
import { db } from "../lib/admin";
import { defineCallable } from "../lib/callable";
import { parseNeed, publishNeed, type NeedLimits } from "../needs/service";

const runningInEmulator = process.env.FUNCTIONS_EMULATOR === "true";

function limits(): NeedLimits {
  return {
    dailyAiParses: aiDailyUserParses.value(),
    dailyDrafts: needDailyDrafts.value(),
    dailyPublishes: needDailyPublishes.value(),
    dailyTokenBudget: aiDailyTokenBudget.value(),
  };
}

function extractor(): NeedExtractor {
  if (runningInEmulator && process.env.AI_PROVIDER !== "anthropic") return createFakeNeedExtractor();
  return createAnthropicNeedExtractor({
    createMessage: createAnthropicMessages(anthropicApiKey.value()),
    model: aiModel.value(),
  });
}

export const parseNeedCallable = defineCallable("parseNeed", {
  access: "verified",
  secrets: [anthropicApiKey],
  handler: (input, caller) => parseNeed({ firestore: db(), extractor: extractor(), limits: limits() }, caller.uid, input),
});

export const publishNeedCallable = defineCallable("publishNeed", {
  access: "verified",
  handler: (input, caller) => publishNeed({ firestore: db(), limits: limits() }, caller.uid, input),
});
