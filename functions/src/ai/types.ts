import type { AiNeedOutput } from "./need-output";

export type TokenUsage = { inputTokens: number; outputTokens: number };

export type ExtractionFailure =
  | "invalid-output"
  | "truncated"
  | "refusal"
  | "timeout"
  | "unavailable"
  | "rate-limited"
  | "rejected"
  | "misconfigured";

export type NeedExtraction =
  | { ok: true; output: AiNeedOutput; usage: TokenUsage; model: string }
  | { ok: false; reason: ExtractionFailure; usage: TokenUsage; detail?: string };

export type NeedExtractionInput = { text: string; now: Date };

export interface NeedExtractor {
  extractNeed(input: NeedExtractionInput): Promise<NeedExtraction>;
}

export const NO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0 };
