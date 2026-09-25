"use client";

import { AppShell } from "@/features/app/AppShell";
import { RequireProfile } from "@/features/app/guards";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireProfile>
      <AppShell>{children}</AppShell>
    </RequireProfile>
  );
}
