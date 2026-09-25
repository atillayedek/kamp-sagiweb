import { CONTRACT_VERSION } from "@kampusagi/contracts";
import { defineCallable } from "../lib/callable";

export const ping = defineCallable("ping", {
  access: "signed-in",
  handler: async () => ({
    ok: true as const,
    serverTime: new Date().toISOString(),
    contractVersion: CONTRACT_VERSION,
  }),
});
