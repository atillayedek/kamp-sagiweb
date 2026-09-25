import {
  callables,
  callableTimeoutSeconds,
  type CallableKey,
  type CallableRequest,
  type CallableResponse,
} from "@kampusagi/contracts";
import { httpsCallable, type Functions } from "firebase/functions";
import { toAppError } from "../errors";
import { parseOrThrow } from "../parse";
import type { FunctionsConnector } from "../types";

export class FirebaseFunctionsConnector implements FunctionsConnector {
  constructor(private readonly functions: Functions) {}

  async call<K extends CallableKey>(key: K, input: CallableRequest<K>): Promise<CallableResponse<K>> {
    const contract = callables[key];
    const request = parseOrThrow(contract.request, input, `${contract.name} isteği`);
    let data: unknown;
    try {
      const timeout = (callableTimeoutSeconds(key) + 10) * 1000;
      data = (await httpsCallable(this.functions, contract.name, { timeout })(request)).data;
    } catch (error) {
      throw toAppError(error);
    }
    return parseOrThrow(contract.response, data, `${contract.name} yanıtı`) as CallableResponse<K>;
  }
}
