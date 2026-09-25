import type { Metadata } from "next";
import { DesignGallery } from "./DesignGallery";

export const metadata: Metadata = {
  title: "Tasarım sistemi",
  description: "KampüsAğı bileşen galerisi (iç kullanım).",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignGallery />;
}
