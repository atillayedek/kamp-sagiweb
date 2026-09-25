"use client";

import { useEffect, useState } from "react";
import type { z } from "zod";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError, type AppError } from "@/connectors/errors";

export type DocumentState<T> =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; data: T }
  | { status: "error"; error: AppError };

export function useDocument<S extends z.ZodType>(path: string | null, schema: S): DocumentState<z.output<S>> {
  const { documents } = useConnectors();
  const [state, setState] = useState<{ path: string; value: DocumentState<z.output<S>> } | null>(null);

  useEffect(() => {
    if (!path) return;
    return documents.watchDocument(
      path,
      schema,
      (data) => setState({ path, value: data === null ? { status: "missing" } : { status: "ready", data } }),
      (error) => setState({ path, value: { status: "error", error: toAppError(error) } }),
    );
  }, [documents, path, schema]);

  if (!path || state?.path !== path) return { status: "loading" };
  return state.value;
}
