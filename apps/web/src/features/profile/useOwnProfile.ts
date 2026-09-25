"use client";

import { publicProfileSchema, type PublicProfile } from "@kampusagi/contracts";
import { useEffect, useState } from "react";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError, type AppError } from "@/connectors/errors";

export type OwnProfileState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; profile: PublicProfile }
  | { status: "error"; error: AppError };

export function useOwnProfile(uid: string | null): OwnProfileState {
  const { documents } = useConnectors();
  const [state, setState] = useState<{ uid: string; value: OwnProfileState } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return documents.watchDocument(
      `users/${uid}`,
      publicProfileSchema,
      (profile) => setState({ uid, value: profile ? { status: "ready", profile } : { status: "missing" } }),
      (error) => setState({ uid, value: { status: "error", error: toAppError(error) } }),
    );
  }, [documents, uid]);

  if (!uid || state?.uid !== uid) return { status: "loading" };
  return state.value;
}
