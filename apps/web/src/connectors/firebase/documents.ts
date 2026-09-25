import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type Firestore,
  type Query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { z } from "zod";
import { toAppError } from "../errors";
import { parseOrThrow } from "../parse";
import {
  serverTime,
  type Cursor,
  type DocumentSource,
  type DocumentWriter,
  type FieldValue,
  type PageOptions,
  type QueryOptions,
} from "../types";

function constraintsFor(options: QueryOptions): QueryConstraint[] {
  return [
    ...(options.where ?? []).map(([field, operator, value]) => where(field, operator, value)),
    ...(options.orderBy ? [orderBy(options.orderBy[0], options.orderBy[1])] : []),
    ...(options.limit ? [limit(options.limit)] : []),
  ];
}

async function run(target: Query) {
  try {
    return await getDocs(target);
  } catch (error) {
    throw toAppError(error);
  }
}

function toFirestore(fields: Record<string, FieldValue>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value === serverTime ? serverTimestamp() : value]));
}

function isTimestampLike(value: object): value is { toDate: () => Date } {
  return "toDate" in value && typeof value.toDate === "function";
}

export function normalizeFirestoreData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeFirestoreData);
  if (value !== null && typeof value === "object") {
    if (isTimestampLike(value)) return value.toDate().toISOString();
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeFirestoreData(entry)]));
  }
  return value;
}

export class FirebaseDocumentSource implements DocumentSource {
  constructor(private readonly firestore: Firestore) {}

  async getDocument<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S> | null> {
    let snapshot;
    try {
      snapshot = await getDoc(doc(this.firestore, path));
    } catch (error) {
      throw toAppError(error);
    }
    return snapshot.exists() ? parseOrThrow(schema, normalizeFirestoreData(snapshot.data()), path) : null;
  }

  async listCollection<S extends z.ZodType>(path: string, schema: S) {
    let snapshot;
    try {
      snapshot = await getDocs(collection(this.firestore, path));
    } catch (error) {
      throw toAppError(error);
    }
    return snapshot.docs.map((item) => ({
      id: item.id,
      data: parseOrThrow(schema, normalizeFirestoreData(item.data()), `${path}/${item.id}`),
    }));
  }

  async queryCollection<S extends z.ZodType>(path: string, options: QueryOptions, schema: S) {
    const snapshot = await run(query(collection(this.firestore, path), ...constraintsFor(options)));
    return snapshot.docs.map((item) => ({
      id: item.id,
      data: parseOrThrow(schema, normalizeFirestoreData(item.data()), `${path}/${item.id}`),
    }));
  }

  async queryPage<S extends z.ZodType>(path: string, options: PageOptions, schema: S) {
    const after = options.after as unknown as QueryDocumentSnapshot | null | undefined;
    const source = options.collectionGroup ? collectionGroup(this.firestore, path) : collection(this.firestore, path);
    const constraints = [
      ...constraintsFor({ ...options, limit: undefined }),
      ...(after ? [startAfter(after)] : []),
      limit(options.limit + 1),
    ];
    const snapshot = await run(query(source, ...constraints));
    const docs = snapshot.docs.slice(0, options.limit);
    const items = docs.map((item) => ({
      id: item.id,
      data: parseOrThrow(schema, normalizeFirestoreData(item.data()), item.ref.path),
    }));
    const hasMore = snapshot.docs.length > options.limit;
    return { items, next: hasMore ? (docs.at(-1) as unknown as Cursor) : null };
  }

  async queryCollectionGroup<S extends z.ZodType>(collectionId: string, options: QueryOptions, schema: S) {
    const snapshot = await run(query(collectionGroup(this.firestore, collectionId), ...constraintsFor(options)));
    return snapshot.docs.map((item) => ({
      id: item.id,
      path: item.ref.path,
      data: parseOrThrow(schema, normalizeFirestoreData(item.data()), item.ref.path),
    }));
  }

  watchDocument<S extends z.ZodType>(
    path: string,
    schema: S,
    onNext: (value: z.output<S> | null) => void,
    onError: (error: unknown) => void,
  ) {
    return onSnapshot(
      doc(this.firestore, path),
      (snapshot) => {
        try {
          onNext(snapshot.exists() ? parseOrThrow(schema, normalizeFirestoreData(snapshot.data()), path) : null);
        } catch (error) {
          onError(error);
        }
      },
      (error) => onError(toAppError(error)),
    );
  }
}

export class FirebaseDocumentWriter implements DocumentWriter {
  constructor(private readonly firestore: Firestore) {}

  private async attempt(operation: () => Promise<void>) {
    try {
      await operation();
    } catch (error) {
      throw toAppError(error);
    }
  }

  async createDocument(collectionPath: string, fields: Record<string, FieldValue>) {
    try {
      return (await addDoc(collection(this.firestore, collectionPath), toFirestore(fields))).id;
    } catch (error) {
      throw toAppError(error);
    }
  }

  setDocument(path: string, fields: Record<string, FieldValue>) {
    return this.attempt(() => setDoc(doc(this.firestore, path), toFirestore(fields)));
  }

  updateFields(path: string, fields: Record<string, FieldValue>) {
    return this.attempt(() => updateDoc(doc(this.firestore, path), toFirestore(fields)));
  }

  deleteDocument(path: string) {
    return this.attempt(() => deleteDoc(doc(this.firestore, path)));
  }
}
