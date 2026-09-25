"use client";

import { universitySchema } from "@kampusagi/contracts";
import { useEffect, useState } from "react";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError, type AppError } from "@/connectors/errors";

export type UniversityOption = { id: string; name: string; city: string };

type UniversitiesState =
  | { status: "loading" }
  | { status: "ready"; universities: UniversityOption[] }
  | { status: "error"; error: AppError };

const collator = new Intl.Collator("tr");

export function useUniversities(): UniversitiesState {
  const { documents } = useConnectors();
  const [state, setState] = useState<UniversitiesState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    documents.listCollection("universities", universitySchema).then(
      (items) => {
        if (!active) return;
        const universities = items
          .map((item) => ({ id: item.id, ...item.data }))
          .sort((a, b) => collator.compare(a.name, b.name));
        setState({ status: "ready", universities });
      },
      (error) => active && setState({ status: "error", error: toAppError(error) }),
    );
    return () => {
      active = false;
    };
  }, [documents]);

  return state;
}
