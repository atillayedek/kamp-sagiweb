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
  signOut(): Promise<void>;
}

export interface FunctionsConnector {
  call<K extends CallableKey>(key: K, input: CallableRequest<K>): Promise<CallableResponse<K>>;
}

export interface DocumentSource {
  getDocument<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S> | null>;
  watchDocument<S extends z.ZodType>(
    path: string,
    schema: S,
    onNext: (value: z.output<S> | null) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;
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
}

export interface AnalyticsConnector {
  track(event: string, properties?: Record<string, string | number | boolean>): void;
}

export type Connectors = {
  auth: AuthConnector;
  functions: FunctionsConnector;
  documents: DocumentSource;
  storage: StorageConnector;
  analytics: AnalyticsConnector;
};
