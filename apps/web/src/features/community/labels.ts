import type { Visibility } from "@kampusagi/contracts";
import type { IconName } from "@/components/ui/Icon";

export const visibilityBadges: Record<Visibility, { label: string; icon: IconName }> = {
  campus: { label: "Kampüs", icon: "lock" },
  global: { label: "Tüm üniversiteler", icon: "compass" },
};

export function countLabel(count: number, noun: string): string {
  return `${count.toLocaleString("tr-TR")} ${noun}`;
}

export type Presence =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; on: boolean; initial: boolean; busy: boolean };

/** Sunucu sayacını, kullanıcının bu sayfadaki beğeni/üyelik değişikliğiyle birlikte gösterir. */
export function adjustCount(count: number, presence: Presence): number {
  if (presence.status !== "ready") return Math.max(0, count);
  return Math.max(0, count + Number(presence.on) - Number(presence.initial));
}
