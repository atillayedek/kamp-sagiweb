"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { serverTime, type FieldValue } from "@/connectors/types";
import type { Presence } from "./labels";

const anyDocument = z.object({}).passthrough();

export type { Presence } from "./labels";

type PresenceMessages = { on?: string; off?: string; failed: string };

/**
 * Kullanıcıya ait tek bir alt belgenin (beğeni, üyelik, katılım) varlığını okur ve açıp kapatır.
 * Sayaçlar sunucuda güncellenir; gösterim için `adjustCount` yerel değişikliği yansıtır.
 */
export function usePresence(path: string, field: "createdAt" | "joinedAt", messages: PresenceMessages) {
  const { documents, writer } = useConnectors();
  const toast = useToast();
  const [state, setState] = useState<Presence>({ status: "loading" });
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    documents.getDocument(path, anyDocument).then(
      (value) => {
        if (active) setState({ status: "ready", on: value !== null, initial: value !== null, busy: false });
      },
      () => {
        if (active) setState({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, [documents, path]);

  const toggle = useCallback(async () => {
    if (state.status !== "ready" || busyRef.current) return;
    const next = !state.on;
    busyRef.current = true;
    setState({ ...state, on: next, busy: true });
    try {
      if (next) {
        const fields: Record<string, FieldValue> = { [field]: serverTime };
        try {
          await writer.setDocument(path, fields);
        } catch (error) {
          // Belge zaten varsa Rules bunu güncelleme sayıp reddeder; durum zaten istenen durumdur.
          if ((await documents.getDocument(path, anyDocument).catch(() => null)) === null) throw error;
        }
      } else {
        await writer.deleteDocument(path);
      }
      setState({ ...state, on: next, busy: false });
      const done = next ? messages.on : messages.off;
      if (done) toast.show({ title: done, tone: "success" });
    } catch (error) {
      setState({ ...state, busy: false });
      toast.show({ title: messages.failed, description: toAppError(error).message, tone: "danger" });
    } finally {
      busyRef.current = false;
    }
  }, [documents, field, messages, path, state, toast, writer]);

  return { state, toggle };
}
