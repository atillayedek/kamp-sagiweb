import { universityIdSchema, universitySchema } from "@kampusagi/contracts";
import { describe, expect, it } from "vitest";
import { convert, toTitleCase, universityId } from "../../../../scripts/import-universities.mjs";
import seed from "../../../../firebase/seed/universities.json";

describe("üniversite seed listesi", () => {
  const entries = Object.entries(seed.universities);

  it("her kayıt sözleşmeye uyar; kimlikler ve adlar tekil", () => {
    expect(entries.length).toBeGreaterThanOrEqual(200);
    for (const [id, university] of entries) {
      expect(universityIdSchema.safeParse(id).success, id).toBe(true);
      expect(universitySchema.safeParse(university).success, id).toBe(true);
    }
    expect(new Set(entries.map(([, university]) => university.name)).size).toBe(entries.length);
  });

  it("iletişim veya kişi bilgisi içermez (yalnızca ad ve il)", () => {
    for (const [, university] of entries) expect(Object.keys(university).sort()).toEqual(["city", "name"]);
  });

  it("e2e ve seed betiğinin kullandığı kimlikler var", () => {
    for (const id of ["orta-dogu-teknik", "istanbul-teknik", "ege", "hacettepe", "bogazici"]) {
      expect(seed.universities).toHaveProperty(id);
    }
  });
});

describe("içe aktarma dönüşümü", () => {
  it("Türkçe başlık biçimi: kısaltmalar, bağlaç, tire ve I/İ", () => {
    expect(toTitleCase("TOBB EKONOMİ VE TEKNOLOJİ ÜNİVERSİTESİ")).toBe("TOBB Ekonomi ve Teknoloji Üniversitesi");
    expect(toTitleCase("BEZM-İ ÂLEM VAKIF ÜNİVERSİTESİ")).toBe("Bezm-i Âlem Vakıf Üniversitesi");
    expect(toTitleCase("TÜRK-ALMAN ÜNİVERSİTESİ")).toBe("Türk-Alman Üniversitesi");
    expect(toTitleCase("IĞDIR")).toBe("Iğdır");
    expect(toTitleCase("İSTANBUL 29 MAYIS ÜNİVERSİTESİ")).toBe("İstanbul 29 Mayıs Üniversitesi");
  });

  it("ASCII kimlik üretir, “Üniversitesi” sözcüğünü atar", () => {
    expect(universityId("ORTA DOĞU TEKNİK ÜNİVERSİTESİ")).toBe("orta-dogu-teknik");
    expect(universityId("İSTANBUL ÜNİVERSİTESİ - CERRAHPAŞA")).toBe("istanbul-cerrahpasa");
    expect(universityId("MANİSA CELÂL BAYAR ÜNİVERSİTESİ")).toBe("manisa-celal-bayar");
  });

  it("yalnızca ad ve ili alır, adı başka ili çağrıştıran kaydı uyarır", () => {
    const { universities, warnings } = convert([
      {
        province: "RİZE",
        universities: [
          { name: "SAMSUN ÜNİVERSİTESİ", phone: "0", rector: "X" } as { name: string },
          { name: "RECEP TAYYİP ERDOĞAN ÜNİVERSİTESİ" },
        ],
      },
      { province: "SAMSUN", universities: [{ name: "ONDOKUZ MAYIS ÜNİVERSİTESİ" }] },
    ]);
    expect(universities.samsun).toEqual({ name: "Samsun Üniversitesi", city: "Rize" });
    expect(warnings).toHaveLength(1);
  });
});
