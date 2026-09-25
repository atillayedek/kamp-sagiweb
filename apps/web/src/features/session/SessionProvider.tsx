"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import type { Session } from "@/connectors/types";

export type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session };

type SessionContextValue = SessionState & { refresh: () => Promise<void> };

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useConnectors();
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(
    () =>
      auth.observeSession((session) =>
        setState(session ? { status: "signed-in", session } : { status: "signed-out" }),
      ),
    [auth],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      refresh: async () => {
        const session = await auth.refreshSession();
        setState(session ? { status: "signed-in", session } : { status: "signed-out" });
      },
    }),
    [auth, state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession yalnızca SessionProvider içinde kullanılabilir.");
  return context;
}
