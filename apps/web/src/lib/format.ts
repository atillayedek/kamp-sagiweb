const percentFormatter = new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 0 });
const megabyteFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

export function formatPercent(value: number): string {
  return percentFormatter.format(Math.min(100, Math.max(0, value)) / 100);
}

export function formatMegabytes(bytes: number): string {
  return `${megabyteFormatter.format(bytes / (1024 * 1024))} MB`;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase("tr-TR");
}
