export const APP_TIME_ZONE = "Europe/Istanbul";

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function zonedParts(date: Date, timeZone = APP_TIME_ZONE): ZonedParts {
  const values = Object.fromEntries(formatterFor(timeZone).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function offsetMinutes(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const wholeSeconds = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - wholeSeconds) / 60_000);
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

export function formatZonedIso(date: Date, timeZone = APP_TIME_ZONE): string {
  const parts = zonedParts(date, timeZone);
  const offset = offsetMinutes(date, timeZone);
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  return (
    `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}` +
    `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
  );
}

export function zonedDayKey(date: Date, timeZone = APP_TIME_ZONE): string {
  return formatZonedIso(date, timeZone).slice(0, 10);
}

export function zonedLocalToDate(local: Omit<ZonedParts, "second"> & { second?: number }, timeZone = APP_TIME_ZONE): Date {
  const naive = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second ?? 0);
  let result = naive - offsetMinutes(new Date(naive), timeZone) * 60_000;
  result = naive - offsetMinutes(new Date(result), timeZone) * 60_000;
  return new Date(result);
}
