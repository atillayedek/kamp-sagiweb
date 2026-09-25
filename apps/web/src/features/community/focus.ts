"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Odaklı öğe kaldırıldığında (ör. silinen gönderi) odağı anlamlı bir hedefe taşır.
 * Hedef `tabIndex={-1}` taşımalıdır.
 */
export function useFocusRequest<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (request > 0) ref.current?.focus();
  }, [request]);
  const focus = useCallback(() => setRequest((current) => current + 1), []);
  return [ref, focus] as const;
}
