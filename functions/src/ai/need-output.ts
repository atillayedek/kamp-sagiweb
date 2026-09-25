import { NEED_CATEGORIES, NEED_WHEN_KINDS } from "@kampusagi/contracts";
import { z } from "zod";

export const aiNeedOutputSchema = z.object({
  title: z.string().describe("İlanı özetleyen Türkçe başlık, en fazla 80 karakter"),
  category: z.enum(NEED_CATEGORIES),
  tags: z.array(z.string()).describe("En fazla 8 kısa, küçük harfli Türkçe anahtar kelime"),
  requiredSkills: z.array(z.string()).describe("İlan için gereken beceriler, en fazla 8; yoksa boş liste"),
  participants: z
    .object({ min: z.number(), max: z.number() })
    .describe("İlan sahibi hariç aranan kişi sayısı; belirtilmemişse min 1, max 1"),
  when: z.object({
    kind: z.enum(NEED_WHEN_KINDS),
    startIso: z.string().nullable().describe("Saat dilimi farkıyla ISO 8601, ör. 2026-09-26T18:00:00+03:00"),
    endIso: z.string().nullable(),
    rawText: z.string().nullable().describe("Metindeki zaman ifadesi"),
  }),
  locationHint: z.string().nullable(),
  confidence: z.number().describe("0 ile 1 arasında güven"),
  needsClarification: z.array(z.string()).describe("Eksik önemli bilgi için en fazla 3 kısa Türkçe soru"),
});

export type AiNeedOutput = z.infer<typeof aiNeedOutputSchema>;
