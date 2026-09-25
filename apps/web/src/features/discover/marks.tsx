"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { serverTime, type FieldValue } from "@/connectors/types";

export type MarkKind = "saved" | "interested";

type Mark = Record<MarkKind, boolean>;

type NeedMarksValue = {
  ensure: (needIds: string[]) => void;
  get: (needId: string) => Mark | undefined;
  failed: (needId: string) => boolean;
  busy: (kind: MarkKind, needId: string) => boolean;
  toggle: (kind: MarkKind, needId: string, next: boolean) => Promise<void>;
};

const NeedMarksContext = createContext<NeedMarksValue | null>(null);

const anyDocument = z.object({}).passthrough();

export function NeedMarksProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const { documents, writer } = useConnectors();
  const toast = useToast();
  const [marks, setMarks] = useState<ReadonlyMap<string, Mark | "error">>(new Map());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const requested = useRef(new Set<string>());

  const pathOf = useCallback(
    (kind: MarkKind, needId: string) => (kind === "saved" ? `savedNeeds/${uid}/items/${needId}` : `needs/${needId}/interests/${uid}`),
    [uid],
  );

  const ensure = useCallback(
    (needIds: string[]) => {
      const missing = needIds.filter((id) => !requested.current.has(id));
      if (missing.length === 0) return;
      missing.forEach((id) => requested.current.add(id));
      void Promise.all(
        missing.map(async (id) => {
          try {
            const [saved, interested] = await Promise.all([
              documents.getDocument(pathOf("saved", id), anyDocument),
              documents.getDocument(pathOf("interested", id), anyDocument),
            ]);
            return [id, { saved: saved !== null, interested: interested !== null }] as const;
          } catch {
            requested.current.delete(id);
            return [id, "error"] as const;
          }
        }),
      ).then((entries) => {
        setMarks((current) => new Map([...current, ...entries]));
        if (entries.some(([, mark]) => mark === "error")) {
          toast.show({ title: "Kaydet ve İlgileniyorum durumları yüklenemedi", description: "Sayfayı yenileyip tekrar dene.", tone: "danger" });
        }
      });
    },
    [documents, pathOf, toast],
  );

  const toggle = useCallback(
    async (kind: MarkKind, needId: string, next: boolean) => {
      const key = `${kind}:${needId}`;
      const apply = (value: boolean) =>
        setMarks((current) => {
          const mark = current.get(needId);
          if (!mark || mark === "error") return current;
          return new Map(current).set(needId, { ...mark, [kind]: value });
        });
      setPending((current) => new Set(current).add(key));
      apply(next);
      const path = pathOf(kind, needId);
      const fields: Record<string, FieldValue> =
        kind === "saved" ? { needId, createdAt: serverTime } : { uid, needId, createdAt: serverTime };
      try {
        if (next) {
          await writer.setDocument(path, fields).catch(async (error: unknown) => {
            if ((await documents.getDocument(path, anyDocument)) === null) throw error;
          });
        } else {
          await writer.deleteDocument(path);
        }
        if (kind === "interested") {
          toast.show({ title: next ? "İlgin ilan sahibine iletildi" : "İlgin geri alındı", tone: "success" });
        } else {
          toast.show({ title: next ? "İlan kaydedildi" : "İlan kayıtlardan çıkarıldı", tone: "success" });
        }
      } catch (error) {
        apply(!next);
        toast.show({ title: "İşlem tamamlanamadı", description: toAppError(error).message, tone: "danger" });
      } finally {
        setPending((current) => {
          const updated = new Set(current);
          updated.delete(key);
          return updated;
        });
      }
    },
    [documents, pathOf, toast, uid, writer],
  );

  const value = useMemo<NeedMarksValue>(
    () => ({
      ensure,
      get: (needId) => {
        const mark = marks.get(needId);
        return mark === "error" ? undefined : mark;
      },
      failed: (needId) => marks.get(needId) === "error",
      busy: (kind, needId) => pending.has(`${kind}:${needId}`),
      toggle,
    }),
    [ensure, marks, pending, toggle],
  );

  return <NeedMarksContext.Provider value={value}>{children}</NeedMarksContext.Provider>;
}

export function useNeedMarks(): NeedMarksValue {
  const value = useContext(NeedMarksContext);
  if (!value) throw new Error("useNeedMarks yalnızca NeedMarksProvider içinde kullanılabilir.");
  return value;
}
