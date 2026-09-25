import { doc, getDoc, onSnapshot, type Firestore } from "firebase/firestore";
import type { z } from "zod";
import { toAppError } from "../errors";
import { parseOrThrow } from "../parse";
import type { DocumentSource } from "../types";

export class FirebaseDocumentSource implements DocumentSource {
  constructor(private readonly firestore: Firestore) {}

  async getDocument<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S> | null> {
    let snapshot;
    try {
      snapshot = await getDoc(doc(this.firestore, path));
    } catch (error) {
      throw toAppError(error);
    }
    return snapshot.exists() ? parseOrThrow(schema, snapshot.data(), path) : null;
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
          onNext(snapshot.exists() ? parseOrThrow(schema, snapshot.data(), path) : null);
        } catch (error) {
          onError(error);
        }
      },
      (error) => onError(toAppError(error)),
    );
  }
}
