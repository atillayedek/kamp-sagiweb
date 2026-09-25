export type CspOptions = {
  isDev: boolean;
  useEmulators: boolean;
  appCheck: boolean;
  https: boolean;
  nonce?: string;
};

const RECAPTCHA_SCRIPTS = ["https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"];
const RECAPTCHA_FRAMES = ["https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/"];
const LOCAL_ORIGINS = ["http://127.0.0.1:*", "ws://127.0.0.1:*", "http://localhost:*", "ws://localhost:*"];

function scriptSources({ isDev, appCheck, nonce }: CspOptions): string[] {
  const devOnly = isDev ? ["'unsafe-eval'"] : [];
  const recaptcha = appCheck ? RECAPTCHA_SCRIPTS : [];
  if (nonce) return ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...devOnly, ...recaptcha];
  return ["'self'", "'unsafe-inline'", ...devOnly, ...recaptcha];
}

// Firestore's WebChannel transport loads this image after a network error to tell
// "offline" apart from "server unreachable"; allow exactly this URL, not the whole host.
const FIRESTORE_CONNECTIVITY_PROBE = "https://www.google.com/images/cleardot.gif";

export function buildContentSecurityPolicy(options: CspOptions): string {
  const { isDev, useEmulators, appCheck, https } = options;
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSources(options),
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://firebasestorage.googleapis.com", FIRESTORE_CONNECTIVITY_PROBE],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      "https://*.googleapis.com",
      "https://*.cloudfunctions.net",
      ...(isDev || useEmulators ? LOCAL_ORIGINS : []),
    ],
    "frame-src": [...(options.nonce ? ["'self'", "blob:"] : []), ...(appCheck ? RECAPTCHA_FRAMES : [])],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.length > 0 ? values.join(" ") : "'none'"}`,
  );
  if (https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function cspOptionsFromEnv(nonce?: string): CspOptions {
  return {
    isDev: process.env.NODE_ENV === "development",
    useEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true",
    appCheck: Boolean(process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY),
    https: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://"),
    nonce,
  };
}

export function securityHeaders() {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ];
}
