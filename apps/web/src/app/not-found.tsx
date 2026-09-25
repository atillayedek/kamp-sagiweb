import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <main id="icerik" className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <EmptyState
        className="w-full"
        icon="map-pin"
        title="Aradığın sayfayı bulamadık"
        description="Bağlantı eskimiş ya da sayfa taşınmış olabilir."
        action={<ButtonLink href="/">Ana sayfaya dön</ButtonLink>}
      />
    </main>
  );
}
