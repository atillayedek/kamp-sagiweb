"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/Icon";

export type TearOffAction = {
  id: string;
  label: string;
  icon: IconName;
  toggle?: boolean;
  defaultPressed?: boolean;
  pressed?: boolean;
  busy?: boolean;
  onSelect?: (pressed: boolean) => void;
};

type TearOffStripProps = {
  actions: TearOffAction[];
  context: string;
  className?: string;
};

export function TearOffStrip({ actions, context, className }: TearOffStripProps) {
  const [pressed, setPressed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(actions.map((action) => [action.id, Boolean(action.defaultPressed)])),
  );

  const isPressed = (action: TearOffAction) => action.pressed ?? Boolean(pressed[action.id]);

  function select(action: TearOffAction) {
    if (action.busy) return;
    const next = action.toggle ? !isPressed(action) : true;
    if (action.toggle && action.pressed === undefined) setPressed((current) => ({ ...current, [action.id]: next }));
    action.onSelect?.(next);
  }

  return (
    <div className={cn("relative", className)}>
      <div aria-hidden="true" className="relative mx-3 border-t-2 border-dashed border-line-strong/60">
        <span className="absolute -left-5 -top-[9px] size-4 rounded-full border border-line bg-bg" />
        <span className="absolute -right-5 -top-[9px] size-4 rounded-full border border-line bg-bg" />
      </div>
      <ul className="grid auto-cols-fr grid-flow-col">
        {actions.map((action, index) => {
          const active = isPressed(action);
          return (
            <li key={action.id} className={cn(index > 0 && "border-l border-dashed border-line-strong/60")}>
              <button
                type="button"
                aria-pressed={action.toggle ? active : undefined}
                aria-disabled={action.busy || undefined}
                onClick={() => select(action)}
                className={cn(
                  "group flex min-h-14 w-full origin-top flex-col items-center justify-center gap-1 px-2 py-2.5 text-sm font-semibold",
                  "transition-[transform,background-color,box-shadow] duration-200 ease-paper",
                  "motion-safe:hover:translate-y-0.5 motion-safe:hover:-rotate-1 motion-safe:focus-visible:translate-y-0.5",
                  index === 0 ? "rounded-bl-card" : "",
                  index === actions.length - 1 ? "rounded-br-card" : "",
                  "aria-disabled:cursor-wait aria-disabled:opacity-70",
                  active
                    ? "bg-primary-soft text-primary shadow-card motion-safe:translate-y-1 motion-safe:-rotate-2"
                    : "text-ink hover:bg-bg",
                )}
              >
                <Icon name={active ? "check" : action.icon} className="size-5 text-primary" />
                <span>
                  {action.label}
                  <span className="sr-only">: {context}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
