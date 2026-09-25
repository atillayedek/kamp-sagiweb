import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../errors";
import { serverTime } from "../types";
import { createMockConnectors, InMemoryDocumentSource, MockFunctionsConnector, MockStorageConnector } from "./index";

describe("MockFunctionsConnector", () => {
  it("yanıtı sözleşmeyle doğrular", async () => {
    const functions = new MockFunctionsConnector({
      ping: async () => ({ ok: true, serverTime: "2026-09-25T12:00:00.000Z", contractVersion: 1 }),
    });
    await expect(functions.call("ping", {})).resolves.toMatchObject({ ok: true });
    expect(functions.calls).toEqual([{ key: "ping", input: {} }]);
  });

  it("sözleşme dışı yanıtı reddeder", async () => {
    const functions = new MockFunctionsConnector({
      ping: async () => ({ ok: true, serverTime: "dün", contractVersion: 1 }) as never,
    });
    await expect(functions.call("ping", {})).rejects.toBeInstanceOf(AppError);
  });
});

describe("InMemoryDocumentSource", () => {
  it("şemaya uymayan belgeyi reddeder", async () => {
    const documents = new InMemoryDocumentSource(new Map([["users/u1", { displayName: 42 }]]));
    await expect(documents.getDocument("users/u1", z.object({ displayName: z.string() }))).rejects.toMatchObject({
      code: "internal",
    });
  });

  it("izlenen belgedeki değişikliği bildirir", async () => {
    const documents = new InMemoryDocumentSource();
    const values: unknown[] = [];
    documents.watchDocument("users/u1", z.object({ displayName: z.string() }), (v) => values.push(v), () => undefined);
    documents.set("users/u1", { displayName: "Deniz" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(values).toEqual([null, { displayName: "Deniz" }]);
  });
});

describe("MockStorageConnector", () => {
  it("yüklemeyi kaydeder", async () => {
    const storage = new MockStorageConnector();
    const handle = storage.upload("verification/u1/a.pdf", new Blob(["%PDF-"]), { contentType: "application/pdf" });
    await expect(handle.done).resolves.toEqual({ path: "verification/u1/a.pdf" });
    expect(storage.uploads[0]).toMatchObject({ contentType: "application/pdf" });
  });

  it("iptal edilen yüklemeyi cancelled ile reddeder", async () => {
    const storage = new MockStorageConnector();
    const handle = storage.upload("x.pdf", new Blob(["a"]), { contentType: "application/pdf" });
    handle.cancel();
    await expect(handle.done).rejects.toMatchObject({ code: "cancelled" });
  });
});

describe("InMemoryDocumentSource.queryCollection", () => {
  it("filtreler, sıralar ve sınırlar", async () => {
    const documents = new InMemoryDocumentSource(
      new Map<string, unknown>([
        ["istekler/a", { durum: "bekliyor", sira: 2 }],
        ["istekler/b", { durum: "onaylandi", sira: 1 }],
        ["istekler/c", { durum: "bekliyor", sira: 1 }],
      ]),
    );
    const schema = z.object({ durum: z.string(), sira: z.number() });
    const result = await documents.queryCollection("istekler", { where: [["durum", "==", "bekliyor"]], orderBy: ["sira", "asc"], limit: 5 }, schema);
    expect(result.map((item) => item.id)).toEqual(["c", "a"]);
  });
});

describe("InMemoryDocumentWriter", () => {
  it("alanları mevcut belgeye yazar ve dinleyicilere yansıtır", async () => {
    const documents = new InMemoryDocumentSource(new Map<string, unknown>([["ilanlar/a/eslesmeler/b", { durum: "onerildi", skor: 80 }]]));
    const connectors = createMockConnectors({ documents });
    const schema = z.object({ durum: z.string(), skor: z.number() });
    const seen: unknown[] = [];
    connectors.documents.watchDocument("ilanlar/a/eslesmeler/b", schema, (value) => seen.push(value), () => undefined);
    await connectors.writer.updateFields("ilanlar/a/eslesmeler/b", { durum: "gizlendi" });
    await expect(documents.getDocument("ilanlar/a/eslesmeler/b", schema)).resolves.toEqual({ durum: "gizlendi", skor: 80 });
    expect(seen.at(-1)).toEqual({ durum: "gizlendi", skor: 80 });
  });

  it("olmayan belgede not-found döndürür", async () => {
    const connectors = createMockConnectors();
    await expect(connectors.writer.updateFields("yok/belge", { a: 1 })).rejects.toMatchObject({ code: "not-found" });
  });
});

describe("InMemoryDocumentSource sayfalama ve collection group", () => {
  const schema = z.object({ sira: z.number(), sahip: z.string().optional() });

  it("imleçle sayfa sayfa döndürür", async () => {
    const documents = new InMemoryDocumentSource(
      new Map<string, unknown>(Array.from({ length: 5 }, (_, index) => [`ilanlar/${index}`, { sira: index }])),
    );
    const first = await documents.queryPage("ilanlar", { orderBy: ["sira", "desc"], limit: 2 }, schema);
    expect(first.items.map((item) => item.data.sira)).toEqual([4, 3]);
    const second = await documents.queryPage("ilanlar", { orderBy: ["sira", "desc"], limit: 2, after: first.next }, schema);
    expect(second.items.map((item) => item.data.sira)).toEqual([2, 1]);
    const last = await documents.queryPage("ilanlar", { orderBy: ["sira", "desc"], limit: 2, after: second.next }, schema);
    expect(last.items.map((item) => item.data.sira)).toEqual([0]);
    expect(last.next).toBeNull();
  });

  it("aynı adlı alt koleksiyonları birlikte sorgular", async () => {
    const documents = new InMemoryDocumentSource(
      new Map<string, unknown>([
        ["ilanlar/a/ilgiler/u1", { sira: 1, sahip: "u1" }],
        ["ilanlar/b/ilgiler/u1", { sira: 2, sahip: "u1" }],
        ["ilanlar/b/ilgiler/u2", { sira: 3, sahip: "u2" }],
      ]),
    );
    const result = await documents.queryCollectionGroup("ilgiler", { where: [["sahip", "==", "u1"]], orderBy: ["sira", "desc"] }, schema);
    expect(result.map((item) => item.path)).toEqual(["ilanlar/b/ilgiler/u1", "ilanlar/a/ilgiler/u1"]);
  });
});

describe("InMemoryDocumentWriter oluşturma ve silme", () => {
  it("sunucu zamanını ISO tarihe çevirir ve belgeyi siler", async () => {
    const documents = new InMemoryDocumentSource();
    const connectors = createMockConnectors({ documents });
    await connectors.writer.setDocument("kayitlar/u1/ogeler/n1", { needId: "n1", createdAt: serverTime });
    const saved = documents.peek("kayitlar/u1/ogeler/n1") as { createdAt: string };
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await connectors.writer.deleteDocument("kayitlar/u1/ogeler/n1");
    expect(documents.peek("kayitlar/u1/ogeler/n1")).toBeUndefined();
  });
});

describe("InMemoryDocumentWriter otomatik kimlik", () => {
  it("koleksiyona yeni kimlikle belge ekler", async () => {
    const documents = new InMemoryDocumentSource();
    const connectors = createMockConnectors({ documents });
    const first = await connectors.writer.createDocument("gonderiler", { metin: "a", createdAt: serverTime });
    const second = await connectors.writer.createDocument("gonderiler", { metin: "b", createdAt: serverTime });
    expect(first).not.toBe(second);
    expect(documents.peek(`gonderiler/${second}`)).toMatchObject({ metin: "b" });
  });
});

describe("InMemoryDocumentSource tarih filtresi", () => {
  it("ISO alanı Date değeriyle karşılaştırır", async () => {
    const documents = new InMemoryDocumentSource(
      new Map([
        ["etkinlikler/gecmis", { baslangic: "2026-09-20T10:00:00.000Z" }],
        ["etkinlikler/gelecek", { baslangic: "2026-10-20T10:00:00.000Z" }],
      ]),
    );
    const schema = z.object({ baslangic: z.string() });
    const result = await documents.queryCollection(
      "etkinlikler",
      { where: [["baslangic", ">=", new Date("2026-09-25T00:00:00Z")]] },
      schema,
    );
    expect(result.map((item) => item.id)).toEqual(["gelecek"]);
  });
});
