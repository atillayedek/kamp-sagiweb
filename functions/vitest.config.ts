import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@kampusagi/contracts": fileURLToPath(new URL("../packages/contracts/src/index.ts", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.emulator.test.ts", "node_modules/**"],
    environment: "node",
  },
});
