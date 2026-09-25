import {
  callables,
  type CallableKey,
  type CallableRequest,
  type CallableResponse,
} from "@kampusagi/contracts";
import type { z } from "zod";
import { noopAnalytics } from "../analytics";
import { AppError } from "../errors";
import { parseOrThrow } from "../parse";
import type {
  AuthConnector,
  Connectors,
  DocumentSource,
  FunctionsConnector,
  Session,
  StorageConnector,
  UploadOptions,
} from "../types";

export class InMemoryAuthConnector implements AuthConnector {
  private listeners = new Set<(session: Session | null) => void>();

  constructor(private session: Session | null = null) {}

  setSession(session: Session | null) {
    this.session = session;
    for (const listener of this.listeners) listener(session);
  }

  observeSession(listener: (session: Session | null) => void) {
    this.listeners.add(listener);
    listener(this.session);
    return () => void this.listeners.delete(listener);
  }

  async refreshSession() {
    return this.session;
  }

  async signInWithEmail(email: string) {
    this.setSession({ user: { uid: `uid-${email}`, email, emailVerified: true }, claims: {} });
  }

  async signUpWithEmail(email: string) {
    this.setSession({ user: { uid: `uid-${email}`, email, emailVerified: false }, claims: {} });
  }

  async sendPasswordReset() {}

  async signOut() {
    this.setSession(null);
  }
}

type MockHandlers = { [K in CallableKey]?: (input: CallableRequest<K>) => Promise<CallableResponse<K>> };

export class MockFunctionsConnector implements FunctionsConnector {
  readonly calls: Array<{ key: CallableKey; input: unknown }> = [];

  constructor(private readonly handlers: MockHandlers = {}) {}

  async call<K extends CallableKey>(key: K, input: CallableRequest<K>): Promise<CallableResponse<K>> {
    this.calls.push({ key, input });
    const handler = this.handlers[key] as ((input: CallableRequest<K>) => Promise<CallableResponse<K>>) | undefined;
    if (!handler) throw new AppError("unavailable");
    return parseOrThrow(callables[key].response, await handler(input), key) as CallableResponse<K>;
  }
}

export class InMemoryDocumentSource implements DocumentSource {
  private listeners = new Map<string, Set<() => void>>();

  constructor(private readonly documents = new Map<string, unknown>()) {}

  set(path: string, value: unknown) {
    this.documents.set(path, value);
    for (const listener of this.listeners.get(path) ?? []) listener();
  }

  async getDocument<S extends z.ZodType>(path: string, schema: S) {
    return this.documents.has(path) ? parseOrThrow(schema, this.documents.get(path), path) : null;
  }

  async listCollection<S extends z.ZodType>(path: string, schema: S) {
    const prefix = `${path}/`;
    return [...this.documents.entries()]
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
      .map(([key, value]) => ({ id: key.slice(prefix.length), data: parseOrThrow(schema, value, key) }));
  }

  watchDocument<S extends z.ZodType>(
    path: string,
    schema: S,
    onNext: (value: z.output<S> | null) => void,
    onError: (error: unknown) => void,
  ) {
    const emit = () => {
      this.getDocument(path, schema).then(onNext, onError);
    };
    const set = this.listeners.get(path) ?? new Set();
    set.add(emit);
    this.listeners.set(path, set);
    emit();
    return () => void set.delete(emit);
  }
}

export class MockStorageConnector implements StorageConnector {
  readonly uploads: Array<{ path: string; contentType: string; size: number }> = [];

  upload(path: string, file: Blob, options: UploadOptions) {
    let cancelled = false;
    const done = new Promise<{ path: string }>((resolve, reject) => {
      queueMicrotask(() => {
        if (cancelled) return reject(new AppError("cancelled"));
        options.onProgress?.(100);
        this.uploads.push({ path, contentType: options.contentType, size: file.size });
        resolve({ path });
      });
    });
    return { done, cancel: () => void (cancelled = true) };
  }
}

export function createMockConnectors(overrides: Partial<Connectors> = {}): Connectors {
  return {
    auth: new InMemoryAuthConnector(),
    functions: new MockFunctionsConnector(),
    documents: new InMemoryDocumentSource(),
    storage: new MockStorageConnector(),
    analytics: noopAnalytics,
    ...overrides,
  };
}
