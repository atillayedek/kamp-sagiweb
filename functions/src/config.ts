import { defineInt, defineSecret, defineString } from "firebase-functions/params";

export const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

export const aiModel = defineString("AI_MODEL", { default: "claude-opus-5" });

export const aiDailyUserParses = defineInt("AI_DAILY_USER_PARSES", { default: 20 });

export const aiDailyTokenBudget = defineInt("AI_DAILY_TOKEN_BUDGET", { default: 2_000_000 });

export const needDailyDrafts = defineInt("NEED_DAILY_DRAFTS", { default: 60 });

export const needDailyPublishes = defineInt("NEED_DAILY_PUBLISHES", { default: 10 });

export const clubDailyCreates = defineInt("CLUB_DAILY_CREATES", { default: 2 });

export const eventDailyCreates = defineInt("EVENT_DAILY_CREATES", { default: 5 });

export const reportDailyLimit = defineInt("REPORT_DAILY_LIMIT", { default: 20 });
