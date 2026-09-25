import type { MatchBreakdown, MatchComponent, NeedCategory } from "@kampusagi/contracts";
import type { MatchingConfig } from "./config";

export type ScoringNeed = {
  universityId: string;
  category: NeedCategory;
  categoryLabel: string;
  tags: string[];
  requiredSkills: string[];
  authorDepartment: string;
};

export type ScoringCandidate = {
  universityId: string;
  interests: string[];
  skills: string[];
  department: string;
};

export type CandidateScore = {
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
  relevant: boolean;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("tr-TR");

function overlap(wanted: string[], available: Set<string>): string[] {
  return [...new Set(wanted.map(normalize))].filter((value) => available.has(value));
}

function listText(values: string[]) {
  return values.slice(0, 3).join(", ");
}

export function scoreCandidate(need: ScoringNeed, candidate: ScoringCandidate, config: MatchingConfig): CandidateScore {
  const interests = new Set(candidate.interests.map(normalize));
  const everything = new Set([...interests, ...candidate.skills.map(normalize)]);
  const skills = new Set(candidate.skills.map(normalize));

  const categoryTerms = config.categoryTerms[need.category];
  const sharedTags = overlap(need.tags, everything);
  const sharedSkills = overlap(need.requiredSkills, skills);
  const categoryHit = overlap(categoryTerms, everything);
  const authorDepartment = normalize(need.authorDepartment);

  const fractions: Record<MatchComponent, number | null> = {
    campus: need.universityId === candidate.universityId ? 1 : 0,
    category: categoryTerms.length > 0 ? (categoryHit.length > 0 ? 1 : 0) : null,
    tags: need.tags.length > 0 ? Math.min(1, sharedTags.length / Math.min(3, need.tags.length)) : null,
    skills: need.requiredSkills.length > 0 ? sharedSkills.length / need.requiredSkills.length : null,
    department: authorDepartment ? (normalize(candidate.department) === authorDepartment ? 1 : 0) : null,
    reliability: config.neutralReliability,
  };

  const components = Object.keys(fractions) as MatchComponent[];
  const applicableWeight = components.reduce(
    (sum, component) => (fractions[component] === null ? sum : sum + config.weights[component]),
    0,
  );
  const breakdown = Object.fromEntries(
    components.map((component) => {
      const fraction = fractions[component];
      if (fraction === null || applicableWeight === 0) return [component, null];
      return [component, Math.round(((fraction * config.weights[component]) / applicableWeight) * 1000) / 10];
    }),
  ) as MatchBreakdown;
  const raw = components.reduce((sum, component) => sum + (fractions[component] ?? 0) * config.weights[component], 0);
  const score = applicableWeight === 0 ? 0 : Math.round((raw / applicableWeight) * 100);

  const reasons: string[] = [];
  if (fractions.campus === 1) reasons.push("Aynı kampüstesiniz");
  if (sharedSkills.length > 0) {
    reasons.push(`Beceri uyumu (${sharedSkills.length}/${need.requiredSkills.length}): ${listText(sharedSkills)}`);
  }
  if (sharedTags.length > 0) reasons.push(`Ortak ilgi alanı: ${listText(sharedTags)}`);
  if (fractions.category === 1) reasons.push(`${need.categoryLabel} alanına ilgi var`);
  if (fractions.department === 1) reasons.push("Aynı bölüm");

  const relevant = [fractions.category, fractions.tags, fractions.skills].some((fraction) => (fraction ?? 0) > 0);
  return { score, breakdown, reasons, relevant };
}
