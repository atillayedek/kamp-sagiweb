"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Connectors } from "./types";

const ConnectorsContext = createContext<Connectors | null>(null);

const noopSubscribe = () => () => undefined;

type ConnectorsProviderProps = {
  create: () => Connectors;
  fallback: ReactNode;
  errorFallback: ReactNode;
  children: ReactNode;
};

export function ConnectorsProvider({ create, fallback, errorFallback, children }: ConnectorsProviderProps) {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const state = useMemo(() => {
    if (!isClient) return null;
    try {
      return { connectors: create() };
    } catch {
      return { failed: true as const };
    }
  }, [isClient, create]);

  if (!state) return fallback;
  if ("failed" in state) return errorFallback;
  return <ConnectorsContext.Provider value={state.connectors}>{children}</ConnectorsContext.Provider>;
}

export function useConnectors(): Connectors {
  const connectors = useContext(ConnectorsContext);
  if (!connectors) throw new Error("useConnectors yalnızca ConnectorsProvider içinde kullanılabilir.");
  return connectors;
}
