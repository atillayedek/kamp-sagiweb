import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "../../security-headers";
import { proxy } from "../proxy";
import { isAppRoute } from "./routes";

const base = { isDev: false, useEmulators: false, appCheck: false, https: true };

function directive(csp: string, name: string): string {
  return csp.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";
}

describe("buildContentSecurityPolicy", () => {
  it("nonce verildiğinde satır içi betiklere yalnızca nonce ile izin verir", () => {
    const script = directive(buildContentSecurityPolicy({ ...base, nonce: "abc" }), "script-src");
    expect(script).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
  });

  it("üretimde eval'e hiçbir modda izin vermez", () => {
    expect(buildContentSecurityPolicy(base)).not.toContain("unsafe-eval");
    expect(buildContentSecurityPolicy({ ...base, nonce: "abc" })).not.toContain("unsafe-eval");
  });

  it("Google'dan yalnızca Firestore bağlantı denetimi görselini yükler", () => {
    const images = directive(buildContentSecurityPolicy(base), "img-src");
    expect(images).toContain("https://www.google.com/images/cleardot.gif");
    expect(images.split(" ").filter((source) => source.includes("www.google.com"))).toEqual([
      "https://www.google.com/images/cleardot.gif",
    ]);
  });

  it("Anthropic'e tarayıcıdan bağlantıya izin vermez", () => {
    expect(buildContentSecurityPolicy(base)).not.toContain("anthropic");
  });

  it("çerçevelemeyi ve eklentileri engeller", () => {
    const csp = buildContentSecurityPolicy(base);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("yerel adreslere yalnızca geliştirmede veya emulator modunda izin verir", () => {
    expect(buildContentSecurityPolicy(base)).not.toContain("127.0.0.1");
    expect(buildContentSecurityPolicy({ ...base, useEmulators: true })).toContain("http://127.0.0.1:*");
  });

  it("App Check açıkken yalnızca reCAPTCHA kaynaklarını ekler", () => {
    const csp = buildContentSecurityPolicy({ ...base, appCheck: true });
    expect(directive(csp, "script-src")).toContain("https://www.google.com/recaptcha/");
    expect(directive(csp, "frame-src")).toContain("https://recaptcha.google.com/recaptcha/");
  });

  it("çerçeveye yalnızca uygulama rotalarında blob: önizlemesi için izin verir", () => {
    expect(directive(buildContentSecurityPolicy(base), "frame-src")).toBe("frame-src 'none'");
    expect(directive(buildContentSecurityPolicy({ ...base, nonce: "abc" }), "frame-src")).toBe("frame-src 'self' blob:");
  });

  it("HTTPS olmayan ortamda upgrade-insecure-requests eklemez", () => {
    expect(buildContentSecurityPolicy({ ...base, https: false })).not.toContain("upgrade-insecure-requests");
  });
});

describe("proxy", () => {
  it("uygulama rotalarında her istekte farklı nonce üretir", () => {
    const first = proxy(new NextRequest("http://localhost/kesfet")).headers.get("content-security-policy") ?? "";
    const second = proxy(new NextRequest("http://localhost/kesfet")).headers.get("content-security-policy") ?? "";
    expect(first).toMatch(/'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(first).not.toBe(second);
  });

  it("tanıtım sayfalarında nonce kullanmaz", () => {
    const csp = proxy(new NextRequest("http://localhost/")).headers.get("content-security-policy") ?? "";
    expect(csp).not.toContain("nonce-");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  });
});

describe("isAppRoute", () => {
  it("önek eşleşmesini segment sınırında yapar", () => {
    expect(isAppRoute("/admin")).toBe(true);
    expect(isAppRoute("/admin/kuyruk")).toBe(true);
    expect(isAppRoute("/administrator")).toBe(false);
    expect(isAppRoute("/")).toBe(false);
  });
});
