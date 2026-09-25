import { describe, expect, it } from "vitest";
import { DEFAULT_MATCHING_CONFIG, matchingConfigSchema, mergeMatchingConfig } from "./config";
import { scoreCandidate, type ScoringCandidate, type ScoringNeed } from "./score";

const need: ScoringNeed = {
  universityId: "odtu",
  category: "spor",
  categoryLabel: "Spor",
  tags: ["basketbol", "akşam"],
  requiredSkills: [],
  authorDepartment: "Bilgisayar Mühendisliği",
};

const candidate = (overrides: Partial<ScoringCandidate> = {}): ScoringCandidate => ({
  universityId: "odtu",
  interests: ["basketbol"],
  skills: [],
  department: "Bilgisayar Mühendisliği",
  ...overrides,
});

describe("scoreCandidate", () => {
  it("varsayılan ağırlıklar şemaya uyar ve ham toplam 105'tir (S-03)", () => {
    expect(matchingConfigSchema.safeParse(DEFAULT_MATCHING_CONFIG).success).toBe(true);
    expect(Object.values(DEFAULT_MATCHING_CONFIG.weights).reduce((a, b) => a + b, 0)).toBe(105);
  });

  it("uygulanamayan bileşeni hariç tutup kalanları 100'e normalize eder", () => {
    const result = scoreCandidate(need, candidate(), DEFAULT_MATCHING_CONFIG);
    expect(result.breakdown.skills).toBeNull();
    expect(result.breakdown.campus).toBeCloseTo(37.5, 1);
    const total = Object.values(result.breakdown).reduce<number>((sum, value) => sum + (value ?? 0), 0);
    expect(Math.abs(total - result.score)).toBeLessThanOrEqual(1);
    expect(result.relevant).toBe(true);
  });

  it("gerekçeleri deterministik Türkçe şablonlarla üretir", () => {
    const result = scoreCandidate(
      { ...need, requiredSkills: ["python", "sql"] },
      candidate({ skills: ["Python"], interests: ["basketbol", "satranç"] }),
      DEFAULT_MATCHING_CONFIG,
    );
    expect(result.reasons).toEqual([
      "Aynı kampüstesiniz",
      "Beceri uyumu (1/2): python",
      "Ortak ilgi alanı: basketbol",
      "Spor alanına ilgi var",
      "Aynı bölüm",
    ]);
  });

  it("aynı girdide aynı sonucu verir", () => {
    const a = scoreCandidate(need, candidate(), DEFAULT_MATCHING_CONFIG);
    const b = scoreCandidate(need, candidate(), DEFAULT_MATCHING_CONFIG);
    expect(a).toEqual(b);
  });

  it("yalnızca kampüs/bölüm ortaklığı olanı alakasız sayar", () => {
    const result = scoreCandidate(need, candidate({ interests: ["resim"] }), DEFAULT_MATCHING_CONFIG);
    expect(result.relevant).toBe(false);
    expect(result.reasons).toEqual(["Aynı kampüstesiniz", "Aynı bölüm"]);
  });

  it("daha fazla uyum daha yüksek skor verir", () => {
    const low = scoreCandidate(need, candidate({ department: "Fizik" }), DEFAULT_MATCHING_CONFIG);
    const high = scoreCandidate(need, candidate({ interests: ["basketbol", "akşam"] }), DEFAULT_MATCHING_CONFIG);
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("farklı kampüsü kampüs puanı olmadan değerlendirir", () => {
    const result = scoreCandidate(need, candidate({ universityId: "itu" }), DEFAULT_MATCHING_CONFIG);
    expect(result.breakdown.campus).toBe(0);
    expect(result.reasons).not.toContain("Aynı kampüstesiniz");
  });

  it("etiket ve becerileri büyük/küçük harf duyarsız (tr-TR) karşılaştırır", () => {
    const result = scoreCandidate(
      { ...need, tags: ["ışık"], requiredSkills: ["İngilizce"] },
      candidate({ interests: ["IŞIK"], skills: ["ingilizce"] }),
      DEFAULT_MATCHING_CONFIG,
    );
    expect(result.breakdown.tags).toBeGreaterThan(0);
    expect(result.breakdown.skills).toBeGreaterThan(0);
  });

  it("skor 0–100 aralığında kalır", () => {
    const perfect = scoreCandidate(
      { ...need, requiredSkills: ["python"] },
      candidate({ interests: ["basketbol", "akşam"], skills: ["python"] }),
      { ...DEFAULT_MATCHING_CONFIG, neutralReliability: 1 },
    );
    expect(perfect.score).toBe(100);
  });
});

describe("mergeMatchingConfig", () => {
  it("kısmi ağırlık değişikliğini varsayılanlarla birleştirir ve sürümü işaretler", () => {
    const { config, valid } = mergeMatchingConfig({ weights: { campus: 40 }, updatedAt: "2026-09-25" });
    expect(valid).toBe(true);
    expect(config.weights).toEqual({ ...DEFAULT_MATCHING_CONFIG.weights, campus: 40 });
    expect(config.version).toBe(`${DEFAULT_MATCHING_CONFIG.version}+config`);
  });

  it("belirtilen sürümü kullanır", () => {
    expect(mergeMatchingConfig({ version: "2026-10-v2", minScore: 50 }).config).toMatchObject({ version: "2026-10-v2", minScore: 50 });
  });

  it("geçersiz değerde varsayılana döner ve bunu bildirir", () => {
    expect(mergeMatchingConfig({ minScore: "yüksek" })).toEqual({ config: DEFAULT_MATCHING_CONFIG, valid: false });
    expect(mergeMatchingConfig({ weights: { campus: -1 } }).valid).toBe(false);
  });
});
