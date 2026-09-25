import { MATCH_COMPONENTS, NEED_CATEGORIES, type MatchComponent, type NeedCategory } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import type { Firestore } from "firebase-admin/firestore";
import { z } from "zod";

const weightsSchema = z.object(
  Object.fromEntries(MATCH_COMPONENTS.map((component) => [component, z.number().min(0).max(100)])) as Record<
    MatchComponent,
    z.ZodNumber
  >,
);

const categoryTermsSchema = z.object(
  Object.fromEntries(NEED_CATEGORIES.map((category) => [category, z.array(z.string().min(1).max(30)).max(50)])) as Record<
    NeedCategory,
    z.ZodArray<z.ZodString>
  >,
);

export const matchingConfigSchema = z.object({
  version: z.string().min(1).max(40),
  weights: weightsSchema,
  minScore: z.number().min(0).max(100),
  maxMatches: z.int().min(1).max(100),
  maxCandidates: z.int().min(1).max(2000),
  neutralReliability: z.number().min(0).max(1),
  categoryTerms: categoryTermsSchema,
});

export type MatchingConfig = z.infer<typeof matchingConfigSchema>;

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  version: "2026-09-v1",
  weights: { campus: 30, category: 20, tags: 20, skills: 25, department: 5, reliability: 5 },
  minScore: 40,
  maxMatches: 20,
  maxCandidates: 500,
  neutralReliability: 0.5,
  categoryTerms: {
    ders: ["ders", "ders çalışma", "sınav", "ödev", "matematik", "fizik", "kimya", "biyoloji", "istatistik", "ingilizce", "almanca", "yabancı dil"],
    proje: ["proje", "takım", "hackathon", "girişimcilik", "yazılım", "tasarım", "araştırma", "robotik"],
    spor: ["spor", "basketbol", "futbol", "voleybol", "tenis", "masa tenisi", "badminton", "koşu", "yüzme", "fitness", "bisiklet", "yürüyüş", "dağcılık", "satranç", "e-spor"],
    etkinlik: ["etkinlik", "konser", "müzik", "sinema", "tiyatro", "gezi", "festival", "dans", "fotoğrafçılık"],
    ulasim: ["ulaşım", "yolculuk", "seyahat", "araba", "bisiklet"],
    esya: ["eşya", "kitap", "ikinci el", "takas", "paylaşım"],
    yardim: ["yardım", "gönüllülük", "sosyal sorumluluk", "mentorluk"],
    diger: [],
  },
};

const overridesSchema = z.object({
  version: z.unknown().optional(),
  weights: z.record(z.string(), z.unknown()).optional(),
  categoryTerms: z.record(z.string(), z.unknown()).optional(),
});

export function mergeMatchingConfig(stored: Record<string, unknown>): { config: MatchingConfig; valid: boolean } {
  const overrides = overridesSchema.safeParse(stored);
  const nested = overrides.success ? overrides.data : {};
  const customized = Object.keys(stored).some((key) => key !== "version" && key in DEFAULT_MATCHING_CONFIG);
  const candidate = {
    ...DEFAULT_MATCHING_CONFIG,
    ...stored,
    weights: { ...DEFAULT_MATCHING_CONFIG.weights, ...nested.weights },
    categoryTerms: { ...DEFAULT_MATCHING_CONFIG.categoryTerms, ...nested.categoryTerms },
    version: stored.version ?? (customized ? `${DEFAULT_MATCHING_CONFIG.version}+config` : DEFAULT_MATCHING_CONFIG.version),
  };
  const parsed = matchingConfigSchema.safeParse(candidate);
  if (!parsed.success) return { config: DEFAULT_MATCHING_CONFIG, valid: false };
  return { config: parsed.data, valid: true };
}

export async function loadMatchingConfig(firestore: Firestore): Promise<MatchingConfig> {
  const snapshot = await firestore.doc("config/matching").get();
  if (!snapshot.exists) return DEFAULT_MATCHING_CONFIG;
  const { config, valid } = mergeMatchingConfig(snapshot.data() ?? {});
  if (!valid) logger.error("matching.configInvalid", { fields: Object.keys(snapshot.data() ?? {}) });
  return config;
}
