"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Connectors } from "./types";

const ConnectorsContext = createContext<Connectors | null>(null);

type ConnectorsProviderProps = {
  create: () => Connectors;
  children: ReactNode;
};

export function ConnectorsProvider({ create, children }: ConnectorsProviderProps) {
  const [connectors] = useState(create);
  return <ConnectorsContext.Provider value={connectors}>{children}</ConnectorsContext.Provider>;
}

export function useConnectors(): Connectors {
  const connectors = useContext(ConnectorsContext);
  if (!connectors) throw new Error("useConnectors yalnızca ConnectorsProvider içinde kullanılabilir.");
  return connectors;
}
