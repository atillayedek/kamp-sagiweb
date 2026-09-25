"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { cn } from "@/lib/cn";
import { validatePdfFile } from "@/lib/file-validation";
import { formatMegabytes } from "@/lib/format";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { UploadProgress } from "./UploadProgress";

type FileDropzoneProps = {
  label: string;
  hint?: string;
  maxBytes: number;
  disabled?: boolean;
  progress?: number;
  onFileAccepted?: (file: File) => void;
  onFileCleared?: () => void;
  onCancel?: () => void;
};

export function FileDropzone({
  label,
  hint,
  maxBytes,
  disabled,
  progress,
  onFileAccepted,
  onFileCleared,
  onCancel,
}: FileDropzoneProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploading = typeof progress === "number";

  async function accept(candidate: File | undefined) {
    if (!candidate) return;
    const result = await validatePdfFile(candidate, maxBytes);
    if (!result.ok) {
      setFile(null);
      setError(result.message);
      return;
    }
    setError(null);
    setFile(candidate);
    onFileAccepted?.(candidate);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    void accept(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) void accept(event.dataTransfer.files[0]);
  }

  function clear() {
    setFile(null);
    setError(null);
    onFileCleared?.();
  }

  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <p id={`${inputId}-label`} className="font-semibold text-ink">
        {label}
      </p>
      {hint && (
        <p id={`${inputId}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}

      {file && uploading ? (
        <UploadProgress fileName={file.name} fileSize={file.size} progress={progress} onCancel={onCancel} />
      ) : file ? (
        <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
          <Icon name="file" className="size-6 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{file.name}</p>
            <p className="text-sm text-ink-muted">{formatMegabytes(file.size)}</p>
          </div>
          <IconButton icon="x" label={`${file.name} dosyasını kaldır`} onClick={clear} />
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors",
            "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
            dragging ? "border-primary bg-primary-soft" : "border-line-strong bg-surface hover:bg-bg",
            error && "border-danger",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <Icon name="upload" className="size-7 text-primary" />
          <span className="font-semibold text-primary">PDF seç</span>
          <span className="text-sm text-ink-muted">veya dosyayı buraya sürükle · en fazla {formatMegabytes(maxBytes)}</span>
          <input
            id={inputId}
            type="file"
            accept="application/pdf,.pdf"
            disabled={disabled}
            onChange={onChange}
            aria-labelledby={`${inputId}-label`}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className="sr-only"
          />
        </label>
      )}

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
