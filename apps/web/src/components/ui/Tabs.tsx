"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export type TabItem = {
  id: string;
  label: string;
  icon?: IconName;
  content: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  label: string;
  defaultTabId?: string;
  lazy?: boolean;
  /** `lazy` ile: bir kez açılan panel gizlense de bağlı kalır (durum ve okumalar korunur). */
  keepMounted?: boolean;
  className?: string;
};

export function Tabs({ items, label, defaultTabId, lazy = false, keepMounted = false, className }: TabsProps) {
  const baseId = useId();
  const [requestedId, setRequestedId] = useState(defaultTabId);
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set());
  const activeId = items.some((item) => item.id === requestedId) ? requestedId : items[0]?.id;

  function setActiveId(id: string) {
    setRequestedId(id);
    if (keepMounted && activeId) setVisited((current) => new Set(current).add(activeId).add(id));
  }
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    const item = items[index];
    if (!item) return;
    setActiveId(item.id);
    tabRefs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const keyMap: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = keyMap[event.key];
    if (next === undefined) return;
    event.preventDefault();
    focusTab(next);
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-card bg-sunken p-1">
        {items.map((item, index) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "inline-flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1.5 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-base",
                selected ? "bg-surface text-primary shadow-card" : "text-ink-muted hover:text-ink",
              )}
            >
              {item.icon && <Icon name={item.icon} className="size-4.5" />}
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== activeId}
          tabIndex={0}
          className="mt-4 rounded-card"
        >
          {(!lazy || item.id === activeId || visited.has(item.id)) && item.content}
        </div>
      ))}
    </div>
  );
}
