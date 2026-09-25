export const APP_ROUTE_PREFIXES = ["/giris", "/kayit", "/uygulama", "/kesfet", "/topluluklar", "/mesajlar", "/profil", "/dogrulama", "/admin"] as const;

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
