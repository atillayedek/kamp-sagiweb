import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";

export const PROJECT_ID = "demo-kampusagi";

function rules(file: string): string {
  return readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");
}

export async function createTestEnv(): Promise<RulesTestEnvironment> {
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: rules("firestore.rules"), host: "127.0.0.1", port: 8080 },
    storage: { rules: rules("storage.rules"), host: "127.0.0.1", port: 9199 },
  });
  // Dosyalar sırayla aynı emulator'ı kullanır; önceki dosyanın verisi (ör. engel kayıtları) sonrakini etkilemesin.
  await env.clearFirestore();
  return env;
}
