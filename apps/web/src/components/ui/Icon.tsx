import { cn } from "@/lib/cn";

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const paths = {
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  "arrow-right": ["M5 12h14", "M13 6l6 6-6 6"],
  x: ["M6 6l12 12", "M18 6L6 18"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  "chevron-down": ["M6 9l6 6 6-6"],
  compass: [circle(12, 12, 9), "M15.5 8.5l-2 5-5 2 2-5z"],
  users: [circle(9, 8, 3.5), "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6", circle(17, 9, 2.5), "M16 14.1c2.9.3 5 2.8 5 5.9"],
  chat: ["M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"],
  user: [circle(12, 8, 4), "M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"],
  "shield-check": ["M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z", "M8.5 12l2.5 2.5 4.5-5"],
  lock: ["M6 11h12v10H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
  download: ["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"],
  upload: ["M12 16V4", "M7 9l5-5 5 5", "M5 20h14"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z", circle(12, 12, 3)],
  ban: [circle(12, 12, 9), "M5.6 5.6l12.8 12.8"],
  file: ["M6 3h8l5 5v13H6z", "M14 3v5h5"],
  bookmark: ["M7 4h10v17l-5-4-5 4z"],
  hand: [
    "M8 13V6.5a1.5 1.5 0 0 1 3 0V12",
    "M11 11.5V5a1.5 1.5 0 0 1 3 0v6.5",
    "M14 11.5V7a1.5 1.5 0 0 1 3 0v7c0 3.9-2.7 7-6.5 7-2.7 0-4.2-1.4-5.6-3.6L3.5 15a1.5 1.5 0 0 1 2.4-1.8L8 15.5",
  ],
  clock: [circle(12, 12, 9), "M12 7v5l3 2"],
  "map-pin": ["M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z", circle(12, 10, 2.5)],
  calendar: ["M4 6h16v15H4z", "M4 10h16", "M8 3v4", "M16 3v4"],
  info: [circle(12, 12, 9), "M12 11v5", "M12 8h.01"],
  alert: ["M12 4l9 16H3z", "M12 10v4", "M12 17h.01"],
  sparkle: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"],
  refresh: ["M20 11a8 8 0 1 0-2.3 5.7", "M20 5v6h-6"],
  tag: ["M3 12V4h8l10 10-8 8z", circle(7.5, 7.5, 1.5)],
  settings: [circle(12, 12, 3), "M12 2v3", "M12 19v3", "M2 12h3", "M19 12h3", "M4.9 4.9l2.1 2.1", "M17 17l2.1 2.1", "M4.9 19.1L7 17", "M17 7l2.1-2.1"],
  pencil: ["M4 20l4-1 11-11-3-3L5 16z", "M14 7l3 3"],
} as const;

export type IconName = keyof typeof paths;

type IconProps = {
  name: IconName;
  className?: string;
  strokeWidth?: number;
};

export function Icon({ name, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("size-5 shrink-0", className)}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
