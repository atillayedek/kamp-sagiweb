import { formatMegabytes } from "@/lib/format";
import { Button } from "./Button";
import { Icon } from "./Icon";

type UploadProgressProps = {
  fileName: string;
  fileSize: number;
  progress: number;
  onCancel?: () => void;
};

export function UploadProgress({ fileName, fileSize, progress, onCancel }: UploadProgressProps) {
  const rounded = Math.round(Math.min(100, Math.max(0, progress)));
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Icon name="file" className="size-6 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{fileName}</p>
          <p className="text-sm text-ink-muted">{formatMegabytes(fileSize)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={`${fileName} yükleniyor`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          className="h-2 flex-1 overflow-hidden rounded-pill bg-sunken"
        >
          <div className="h-full rounded-pill bg-primary transition-[width]" style={{ width: `${rounded}%` }} />
        </div>
        <span aria-hidden="true" className="w-12 text-right text-sm tabular-nums text-ink-muted">
          %{rounded}
        </span>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            İptal et
          </Button>
        )}
      </div>
    </div>
  );
}
