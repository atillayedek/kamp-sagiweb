import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../errors";
import { InMemoryDocumentSource, MockFunctionsConnector, MockStorageConnector } from "./index";

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
