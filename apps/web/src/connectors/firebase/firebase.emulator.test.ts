import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../errors";
import type { Session } from "../types";
import { FirebaseAuthConnector } from "./auth";
import { createFirebaseClients, defaultEmulatorHosts } from "./clients";
import { FirebaseDocumentSource } from "./documents";
import { FirebaseFunctionsConnector } from "./functions";
import { FirebaseStorageConnector } from "./storage";

const clients = createFirebaseClients(
  { apiKey: "demo-api-key", projectId: "demo-kampusagi", storageBucket: "demo-kampusagi.appspot.com" },
  { appName: "emulator-test", emulators: defaultEmulatorHosts },
);
const functions = new FirebaseFunctionsConnector(clients.functions);
const documents = new FirebaseDocumentSource(clients.firestore);
const storage = new FirebaseStorageConnector(clients.storage);
const auth = new FirebaseAuthConnector(clients.auth);

describe("oturum yokken", () => {
  it("ping callable'ı unauthenticated ile reddeder", async () => {
    await expect(functions.call("ping", {})).rejects.toMatchObject({ code: "unauthenticated" });
  });
});

describe("oturum açıkken", () => {
  beforeAll(async () => {
    await createUserWithEmailAndPassword(clients.auth, `test-${Date.now()}@example.com`, "gecici-sifre-123");
  });

  afterAll(async () => {
    await signOut(clients.auth);
  });

  it("oturumu custom claim'siz olarak bildirir", async () => {
    const session = await new Promise<Session | null>((resolve) => {
      const stop = auth.observeSession((value) => {
        if (value) {
          stop();
          resolve(value);
        }
      });
    });
    expect(session?.claims).toEqual({});
  });

  it("ping callable'ı sözleşmeye uygun yanıt döner", async () => {
    const response = await functions.call("ping", {});
    expect(response.ok).toBe(true);
    expect(response.contractVersion).toBe(1);
  });

  it("Firestore varsayılan reddi AppError olarak döner", async () => {
    const error = await documents.getDocument("users/herhangi", z.object({})).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("permission-denied");
  });

  it("Storage varsayılan reddi AppError olarak döner", async () => {
    const handle = storage.upload("verification/x/belge.pdf", new Blob(["%PDF-1.7"]), { contentType: "application/pdf" });
    await expect(handle.done).rejects.toMatchObject({ code: "permission-denied" });
  });
});
