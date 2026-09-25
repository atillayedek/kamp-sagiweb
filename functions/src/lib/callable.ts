import {
  callables,
  FUNCTIONS_REGION,
  type CallableKey,
  type CallableRequest,
  type CallableResponse,
} from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type { z } from "zod";
import { parseRequest, resolveCaller, type Access, type Caller } from "./access";
import { appError } from "./errors";

const runningInEmulator = process.env.FUNCTIONS_EMULATOR === "true";

type Handler<K extends CallableKey> = (
  input: z.output<(typeof callables)[K]["request"]>,
  caller: Caller,
) => Promise<CallableResponse<K>>;

type CallableDefinition<K extends CallableKey> = {
  access: Access;
  timeoutSeconds?: number;
  handler: Handler<K>;
};

export function defineCallable<K extends CallableKey>(key: K, definition: CallableDefinition<K>) {
  const contract = callables[key];
  return onCall<CallableRequest<K>>(
    {
      region: FUNCTIONS_REGION,
      enforceAppCheck: !runningInEmulator,
      timeoutSeconds: definition.timeoutSeconds ?? 30,
    },
    async (request) => {
      const startedAt = Date.now();
      try {
        const caller = resolveCaller(request.auth, definition.access);
        const input = parseRequest(contract.request, request.data);
        const output = await definition.handler(input as z.output<(typeof callables)[K]["request"]>, caller);
        const response = contract.response.parse(output);
        logger.info("callable.ok", { callable: contract.name, uid: caller.uid, durationMs: Date.now() - startedAt });
        return response;
      } catch (error) {
        if (error instanceof HttpsError) {
          logger.warn("callable.rejected", { callable: contract.name, code: error.code, durationMs: Date.now() - startedAt });
          throw error;
        }
        logger.error("callable.failed", {
          callable: contract.name,
          errorName: error instanceof Error ? error.name : "unknown",
          durationMs: Date.now() - startedAt,
        });
        throw appError("internal", "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.");
      }
    },
  );
}
