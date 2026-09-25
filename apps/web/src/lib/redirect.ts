export const DEFAULT_APP_PATH = "/profil";

export function safeNextPath(value: string | null | undefined, fallback = DEFAULT_APP_PATH): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://kampusagi.invalid");
    if (url.origin !== "https://kampusagi.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function signInPath(next: string): string {
  return `/giris?next=${encodeURIComponent(safeNextPath(next))}`;
}
