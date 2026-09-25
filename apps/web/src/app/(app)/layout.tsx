import type { Metadata } from "next";
import { connection } from "next/server";
import { AppProviders } from "@/features/app/AppProviders";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <AppProviders>{children}</AppProviders>;
}
