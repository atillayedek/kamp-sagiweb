import type {
  CallableKey,
  CallableRequest,
  CallableResponse,
  CustomClaims,
} from "@kampusagi/contracts";
import type { z } from "zod";

export type Unsubscribe = () => void;

export type SessionUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
};

export type Session = {
  user: SessionUser;
  claims: CustomClaims;
};

export interface AuthConnector {
  observeSession(listener: (session: Session | null) => void): Unsubscribe;
  refreshSession(): Promise<Session | null>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface FunctionsConnector {
  call<K extends CallableKey>(key: K, input: CallableRequest<K>): Promise<CallableResponse<K>>;
}

export type ListedDocument<T> = { id: string; data: T };

export type QueryOptions = {
  where?: Array<[field: string, operator: "==" | "<" | "<=" | ">" | ">=", value: string | number | boolean]>;
  orderBy?: [field: string, direction: "asc" | "desc"];
  limit?: number;
};

declare const cursorBrand: unique symbol;

export type Cursor = { readonly [cursorBrand]: true };

export type PageOptions = QueryOptions & { limit: number; after?: Cursor | null; collectionGroup?: boolean };

export type Page<T> = { items: Array<ListedDocument<T>>; next: Cursor | null };

export interface DocumentSource {
  getDocument<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S> | null>;
  listCollection<S extends z.ZodType>(path: string, schema: S): Promise<Array<ListedDocument<z.output<S>>>>;
  queryCollection<S extends z.ZodType>(
    path: string,
    options: QueryOptions,
    schema: S,
  ): Promise<Array<ListedDocument<z.output<S>>>>;
  queryPage<S extends z.ZodType>(path: string, options: PageOptions, schema: S): Promise<Page<z.output<S>>>;
  queryCollectionGroup<S extends z.ZodType>(
    collectionId: string,
    options: QueryOptions,
    schema: S,
  ): Promise<Array<ListedDocument<z.output<S>> & { path: string }>>;
  watchDocument<S extends z.ZodType>(
    path: string,
    schema: S,
    onNext: (value: z.output<S> | null) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;
}

export const serverTime = Object.freeze({ kind: "server-time" as const });

export type FieldValue = string | number | boolean | null | typeof serverTime;

export interface DocumentWriter {
  setDocument(path: string, fields: Record<string, FieldValue>): Promise<void>;
  updateFields(path: string, fields: Record<string, FieldValue>): Promise<void>;
  deleteDocument(path: string): Promise<void>;
}

export type UploadOptions = {
  contentType: string;
  onProgress?: (percent: number) => void;
};

export type UploadHandle = {
  done: Promise<{ path: string }>;
  cancel: () => void;
};

export interface StorageConnector {
  upload(path: string, file: Blob, options: UploadOptions): UploadHandle;
  download(path: string): Promise<Blob>;
}

export interface AnalyticsConnector {
  track(event: string, properties?: Record<string, string | number | boolean>): void;
}

export type Connectors = {
  auth: AuthConnector;
  functions: FunctionsConnector;
  documents: DocumentSource;
  writer: DocumentWriter;
  storage: StorageConnector;
  analytics: AnalyticsConnector;
};
