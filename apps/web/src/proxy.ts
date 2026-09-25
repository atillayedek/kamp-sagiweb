import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy, cspOptionsFromEnv } from "../security-headers";
import { isAppRoute } from "./lib/routes";

export function proxy(request: NextRequest) {
  if (!isAppRoute(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(cspOptionsFromEnv()));
    return response;
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(cspOptionsFromEnv(nonce));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
