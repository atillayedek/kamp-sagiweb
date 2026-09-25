import type { FirebaseOptions } from "firebase/app";
import { defaultEmulatorHosts, type EmulatorHosts } from "./clients";

export type FirebaseEnvironment = {
  options: FirebaseOptions;
  emulators?: EmulatorHosts;
  appCheckSiteKey?: string;
};

export function readFirebaseEnvironment(): FirebaseEnvironment {
  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? (useEmulators ? "demo-kampusagi" : undefined);
  if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID tanımlı değil.");
  if (!useEmulators && !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET tanımlı değil.");
  }
  return {
    options: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? (useEmulators ? "demo-api-key" : undefined),
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || (useEmulators ? `${projectId}.appspot.com` : undefined),
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    },
    emulators: useEmulators ? defaultEmulatorHosts : undefined,
    appCheckSiteKey: process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY || undefined,
  };
}
