import { callables, type CallableKey, type CallableRequest, type CallableResponse } from "@kampusagi/contracts";
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
      data = (await httpsCallable(this.functions, contract.name)(request)).data;
    } catch (error) {
      throw toAppError(error);
    }
    return parseOrThrow(contract.response, data, `${contract.name} yanıtı`) as CallableResponse<K>;
  }
}
