"use client";

import type { ReactNode } from "react";
import { ConnectorsProvider } from "@/connectors/ConnectorsProvider";
import { createFirebaseConnectors } from "@/connectors/firebase";
import { ErrorState } from "@/components/ui/States";
import { ToastProvider } from "@/components/ui/Toast";
import { SessionProvider } from "@/features/session/SessionProvider";
import { FullPageLoading } from "./FullPageLoading";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConnectorsProvider
      create={createFirebaseConnectors}
      fallback={<FullPageLoading />}
      errorFallback={
        <main id="icerik" className="mx-auto max-w-lg px-4 py-16">
          <ErrorState
            title="Uygulama şu anda açılamıyor"
            description="Yapılandırma eksik görünüyor. Lütfen daha sonra tekrar dene."
          />
        </main>
      }
    >
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </ConnectorsProvider>
  );
}
