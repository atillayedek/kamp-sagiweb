import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import type { z } from "zod";
import { toAppError } from "../errors";
import { parseOrThrow } from "../parse";
import type { DocumentSource, DocumentWriter, FieldValue, QueryOptions } from "../types";

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
    const constraints: QueryConstraint[] = [
      ...(options.where ?? []).map(([field, operator, value]) => where(field, operator, value)),
      ...(options.orderBy ? [orderBy(options.orderBy[0], options.orderBy[1])] : []),
      ...(options.limit ? [limit(options.limit)] : []),
    ];
    let snapshot;
    try {
      snapshot = await getDocs(query(collection(this.firestore, path), ...constraints));
    } catch (error) {
      throw toAppError(error);
    }
    return snapshot.docs.map((item) => ({
      id: item.id,
      data: parseOrThrow(schema, normalizeFirestoreData(item.data()), `${path}/${item.id}`),
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

  async updateFields(path: string, fields: Record<string, FieldValue>) {
    try {
      await updateDoc(doc(this.firestore, path), fields);
    } catch (error) {
      throw toAppError(error);
    }
  }
}
