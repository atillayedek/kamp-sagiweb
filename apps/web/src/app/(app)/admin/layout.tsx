import type { Metadata } from "next";

export const metadata: Metadata = { title: "Moderatör paneli" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
