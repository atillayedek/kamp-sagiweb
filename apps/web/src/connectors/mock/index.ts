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
import { serverTime } from "../types";
import type {
  AuthConnector,
  Connectors,
  Cursor,
  DocumentSource,
  DocumentWriter,
  FieldValue,
  FunctionsConnector,
  PageOptions,
  QueryOptions,
  QueryValue,
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

  peek(path: string): unknown {
    return this.documents.get(path);
  }

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

  async queryCollection<S extends z.ZodType>(path: string, options: QueryOptions, schema: S) {
    let items = (await this.listCollection(path, schema)) as Array<{ id: string; data: Record<string, unknown> }>;
    for (const [field, operator, value] of options.where ?? []) {
      items = items.filter((item) => compare(item.data[field], operator, value));
    }
    if (options.orderBy) {
      const [field, direction] = options.orderBy;
      items = [...items].sort((a, b) => String(a.data[field]).localeCompare(String(b.data[field])) * (direction === "asc" ? 1 : -1));
    }
    return (options.limit ? items.slice(0, options.limit) : items) as Array<{ id: string; data: z.output<S> }>;
  }

  async queryPage<S extends z.ZodType>(path: string, options: PageOptions, schema: S) {
    const all = options.collectionGroup
      ? await this.queryCollectionGroup(path, { ...options, limit: undefined }, schema)
      : await this.queryCollection(path, { ...options, limit: undefined }, schema);
    const start = typeof options.after === "number" ? options.after : 0;
    const items = all.slice(start, start + options.limit);
    const end = start + items.length;
    return { items, next: end < all.length ? (end as unknown as Cursor) : null };
  }

  async queryCollectionGroup<S extends z.ZodType>(collectionId: string, options: QueryOptions, schema: S) {
    const paths = [...this.documents.keys()].filter((key) => {
      const parts = key.split("/");
      return parts.length >= 2 && parts.length % 2 === 0 && parts.at(-2) === collectionId;
    });
    const parents = [...new Set(paths.map((key) => key.split("/").slice(0, -1).join("/")))];
    const results = await Promise.all(parents.map((parent) => this.queryCollection(parent, { ...options, limit: undefined }, schema)));
    let items = results.flatMap((list, index) => list.map((item) => ({ ...item, path: `${parents[index]}/${item.id}` })));
    if (options.orderBy) {
      const [field, direction] = options.orderBy;
      items = items.sort(
        (a, b) =>
          String((a.data as Record<string, unknown>)[field]).localeCompare(String((b.data as Record<string, unknown>)[field])) *
          (direction === "asc" ? 1 : -1),
      );
    }
    return options.limit ? items.slice(0, options.limit) : items;
  }

  remove(path: string) {
    this.documents.delete(path);
    for (const listener of this.listeners.get(path) ?? []) listener();
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

function compare(actual: unknown, operator: string, expected: QueryValue): boolean {
  if (expected instanceof Date) {
    if (typeof actual !== "string") return false;
    return compare(Date.parse(actual), operator, expected.getTime());
  }
  if (operator === "==") return actual === expected;
  if (typeof actual !== typeof expected) return false;
  const a = actual as string | number;
  const b = expected as string | number;
  if (operator === "<") return a < b;
  if (operator === "<=") return a <= b;
  if (operator === ">") return a > b;
  return a >= b;
}

export class MockStorageConnector implements StorageConnector {
  readonly uploads: Array<{ path: string; contentType: string; size: number }> = [];
  private readonly files = new Map<string, Blob>();

  async download(path: string) {
    const file = this.files.get(path);
    if (!file) throw new AppError("not-found");
    return file;
  }

  upload(path: string, file: Blob, options: UploadOptions) {
    let cancelled = false;
    const done = new Promise<{ path: string }>((resolve, reject) => {
      queueMicrotask(() => {
        if (cancelled) return reject(new AppError("cancelled"));
        options.onProgress?.(100);
        this.uploads.push({ path, contentType: options.contentType, size: file.size });
        this.files.set(path, file);
        resolve({ path });
      });
    });
    return { done, cancel: () => void (cancelled = true) };
  }
}

function resolveFields(fields: Record<string, FieldValue>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value === serverTime ? new Date().toISOString() : value]),
  );
}

export class InMemoryDocumentWriter implements DocumentWriter {
  readonly writes: Array<{ kind: "set" | "update" | "delete"; path: string; fields?: Record<string, FieldValue> }> = [];
  private sequence = 0;

  constructor(private readonly documents: InMemoryDocumentSource) {}

  async createDocument(collectionPath: string, fields: Record<string, FieldValue>) {
    this.sequence += 1;
    const id = `auto-${this.sequence}`;
    await this.setDocument(`${collectionPath}/${id}`, fields);
    return id;
  }

  async setDocument(path: string, fields: Record<string, FieldValue>) {
    this.writes.push({ kind: "set", path, fields });
    this.documents.set(path, resolveFields(fields));
  }

  async updateFields(path: string, fields: Record<string, FieldValue>) {
    const current = this.documents.peek(path);
    if (!current || typeof current !== "object") throw new AppError("not-found", "Belge bulunamadı.");
    this.writes.push({ kind: "update", path, fields });
    this.documents.set(path, { ...current, ...resolveFields(fields) });
  }

  async deleteDocument(path: string) {
    this.writes.push({ kind: "delete", path });
    this.documents.remove(path);
  }
}

const unsupported = async () => {
  throw new Error("Özel bir DocumentSource verildiğinde writer da verilmelidir.");
};

const unsupportedWriter: DocumentWriter = {
  createDocument: unsupported,
  setDocument: unsupported,
  updateFields: unsupported,
  deleteDocument: unsupported,
};

export function createMockConnectors(overrides: Partial<Connectors> = {}): Connectors {
  const documents = overrides.documents ?? new InMemoryDocumentSource();
  return {
    auth: new InMemoryAuthConnector(),
    functions: new MockFunctionsConnector(),
    documents,
    writer: documents instanceof InMemoryDocumentSource ? new InMemoryDocumentWriter(documents) : unsupportedWriter,
    storage: new MockStorageConnector(),
    analytics: noopAnalytics,
    ...overrides,
  };
}
