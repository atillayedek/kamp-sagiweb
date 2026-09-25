import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export function FullPageLoading({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <main id="icerik" className="mx-auto max-w-lg px-4 py-16">
      <LoadingRegion label={label}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-11 w-40" />
        </div>
      </LoadingRegion>
    </main>
  );
}
