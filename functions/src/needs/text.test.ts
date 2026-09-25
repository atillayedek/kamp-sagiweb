import { describe, expect, it } from "vitest";
import { cleanNeedText, isValidTckn, maskPii, truncateText } from "./text";

describe("cleanNeedText", () => {
  it("görünmez ve yön değiştiren karakterleri siler", () => {
    expect(cleanNeedText("bas\u200bket\u202e bol\ufeff")).toBe("basket bol");
  });

  it("boşlukları ve fazla satırları sadeleştirir", () => {
    expect(cleanNeedText("  yarın   akşam\t\tmaç \r\n\r\n\r\n\r\n 3 kişi  ")).toBe("yarın akşam maç\n\n3 kişi");
  });

  it("tekrarlanan sembolleri kısaltır ama sayılara ve harflere dokunmaz", () => {
    expect(cleanNeedText("acill!!!!!!! 100000 TL çoooook")).toBe("acill!!! 100000 TL çoooook");
  });

  it("Arapça-Hint rakamlarını ASCII'ye çevirir", () => {
    expect(cleanNeedText("\u0660\u0665\u0663\u0662 \u06f1\u06f2")).toBe("0532 12");
  });

  it("tam genişlikli rakamları normalleştirir", () => {
    expect(cleanNeedText("０５３２")).toBe("0532");
  });
});

describe("maskPii", () => {
  it.each([
    ["0532 123 45 67", "[telefon]"],
    ["05321234567", "[telefon]"],
    ["+90 532 123 45 67", "[telefon]"],
    ["+90 (532) 123-4567", "[telefon]"],
    ["905321234567", "[telefon]"],
    ["0312 123 45 67", "[telefon]"],
    ["532.123.45.67", "[telefon]"],
    ["+44 20 7946 0958", "[telefon]"],
    ["0532/123/45/67", "[telefon]"],
    ["0532_123_45_67", "[telefon]"],
    ["0 5 3 2 1 2 3 4 5 6 7", "[telefon]"],
    ["05 32 123 45 67", "[telefon]"],
    ["0090 532 123 45 67", "[telefon]"],
    ["5321234567", "[telefon]"],
  ])("telefonu gizler: %s", (input, expected) => {
    const result = maskPii(`Beni ara: ${input} lütfen`);
    expect(result.text).toBe(`Beni ara: ${expected} lütfen`);
    expect(result.kinds).toEqual(["phone"]);
  });

  it("e-postayı gizler", () => {
    expect(maskPii("iletişim: ayşe.yılmaz+kamp@metu.edu.tr yaz").text).toBe("iletişim: [e-posta] yaz");
  });

  it("TC kimlik numarasını gizler", () => {
    const result = maskPii("TC: 10000000146 bu");
    expect(result.text).toBe("TC: [TC kimlik no] bu");
    expect(result.kinds).toEqual(["tckn"]);
  });

  it("bölünmüş TC kimlik numarasını sağlama toplamıyla tanır", () => {
    expect(maskPii("TC 100 000 001 46").text).toBe("TC [TC kimlik no]");
    expect(maskPii("TC 100 000 001 47").text).toBe("TC 100 000 001 47");
  });

  it("bitişik 11 haneli sayıyı sağlama toplamından bağımsız gizler", () => {
    expect(maskPii("no 12345678901").text).toBe("no [TC kimlik no]");
  });

  it.each(["TR33 0006 1005 1978 6457 8413 26", "TR330006100519786457841326", "tr33-0006-1005-1978-6457-8413-26"])(
    "IBAN'ı gizler: %s",
    (iban) => {
      const result = maskPii(`IBAN ${iban} gönder`);
      expect(result.text).toBe("IBAN [IBAN] gönder");
      expect(result.kinds).toEqual(["iban"]);
    },
  );

  it("uzun hesap/kart numaralarını gizler", () => {
    expect(maskPii("kart 4111 1111 1111 1111 ile").text).toBe("kart [hesap no] ile");
  });

  it("birden fazla türü birlikte raporlar", () => {
    const result = maskPii("0532 123 45 67 ya da ali@ornek.com");
    expect(result.text).toBe("[telefon] ya da [e-posta]");
    expect(result.kinds.sort()).toEqual(["email", "phone"]);
  });

  it.each([
    "Yarın 18:00'de 3 kişi basket",
    "25.09.2026 tarihinde 2 saatlik çalışma",
    "Bütçe 3.500.000 TL değil 1500 TL",
    "MAT 101 ve FİZ 102 dersleri, 4 kişilik grup",
    "B-204 numaralı sınıf, saat 13.30",
    "3.10.2026 18.30'da buluşalım",
    "26.09.2026 18.00 ile 20.00 arası",
    "2025-2026 güz dönemi, 10 kişi",
    "Saat 20.30 ve 21.45 seansları",
  ])("sıradan metne dokunmaz: %s", (input) => {
    expect(maskPii(input)).toEqual({ text: input, kinds: [] });
  });
});

describe("isValidTckn", () => {
  it("resmî algoritmayı uygular", () => {
    expect(isValidTckn("10000000146")).toBe(true);
    expect(isValidTckn("10000000147")).toBe(false);
    expect(isValidTckn("00000000146")).toBe(false);
    expect(isValidTckn("1000000014")).toBe(false);
  });
});

describe("truncateText", () => {
  it("kelime sınırında keser", () => {
    expect(truncateText("Yarın akşam kampüste basketbol oynayacak arkadaş arıyorum", 30)).toBe("Yarın akşam kampüste");
  });

  it("kısa metni değiştirmez", () => {
    expect(truncateText("Kısa", 30)).toBe("Kısa");
  });
});
