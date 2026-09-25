import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { aiNeedOutputSchema } from "./need-output";
import { buildNeedUserMessage, NEED_SYSTEM_PROMPT } from "./prompt";
import { NO_USAGE, type ExtractionFailure, type NeedExtractor, type TokenUsage } from "./types";

export const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";

export const NEED_MAX_TOKENS = 16000;

export type CreateMessage = (params: MessageCreateParamsNonStreaming) => Promise<BetaMessage>;

let cachedClient: { apiKey: string; createMessage: CreateMessage } | null = null;

export function createAnthropicMessages(apiKey: string): CreateMessage {
  if (cachedClient?.apiKey !== apiKey) {
    const client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
    cachedClient = { apiKey, createMessage: (params) => client.beta.messages.create(params) };
  }
  return cachedClient.createMessage;
}

export function classifyAnthropicError(error: unknown): ExtractionFailure {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (error instanceof Anthropic.RateLimitError) return "rate-limited";
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError ||
    error instanceof Anthropic.NotFoundError
  ) {
    return "misconfigured";
  }
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.UnprocessableEntityError) return "rejected";
  if (error instanceof Anthropic.APIError) return "unavailable";
  throw error;
}

function usageOf(message: BetaMessage): TokenUsage {
  const usage = message.usage;
  return {
    inputTokens:
      usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    outputTokens: usage.output_tokens,
  };
}

const needOutputFormat = betaZodOutputFormat(aiNeedOutputSchema);

export function createAnthropicNeedExtractor(options: { createMessage: CreateMessage; model: string }): NeedExtractor {
  return {
    async extractNeed({ text, now }) {
      let message: BetaMessage;
      try {
        message = await options.createMessage({
          model: options.model,
          max_tokens: NEED_MAX_TOKENS,
          betas: [SERVER_SIDE_FALLBACK_BETA],
          fallbacks: "default",
          system: NEED_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildNeedUserMessage(text, now) }],
          output_config: { format: needOutputFormat },
        });
      } catch (error) {
        return { ok: false, reason: classifyAnthropicError(error), usage: NO_USAGE };
      }

      const usage = usageOf(message);
      if (message.stop_reason === "refusal") {
        return { ok: false, reason: "refusal", usage, detail: message.stop_details?.category ?? undefined };
      }
      if (message.stop_reason === "max_tokens") return { ok: false, reason: "truncated", usage };

      const outputText = message.content.findLast((block) => block.type === "text")?.text;
      if (!outputText) return { ok: false, reason: "invalid-output", usage, detail: "no-text" };
      let json: unknown;
      try {
        json = JSON.parse(outputText);
      } catch {
        return { ok: false, reason: "invalid-output", usage, detail: "json" };
      }
      const parsed = aiNeedOutputSchema.safeParse(json);
      if (!parsed.success) return { ok: false, reason: "invalid-output", usage, detail: "schema" };
      return { ok: true, output: parsed.data, usage, model: message.model };
    },
  };
}
