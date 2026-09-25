import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { noopAnalytics } from "../analytics";
import type { Connectors } from "../types";
import { FirebaseAuthConnector } from "./auth";
import { createFirebaseClients } from "./clients";
import { readFirebaseEnvironment } from "./config";
import { FirebaseDocumentSource } from "./documents";
import { FirebaseFunctionsConnector } from "./functions";
import { FirebaseStorageConnector } from "./storage";

let cached: Connectors | null = null;

export function createFirebaseConnectors(): Connectors {
  if (cached) return cached;
  const environment = readFirebaseEnvironment();
  const clients = createFirebaseClients(environment.options, { emulators: environment.emulators });
  if (typeof window !== "undefined" && environment.appCheckSiteKey && !environment.emulators) {
    initializeAppCheck(clients.app, {
      provider: new ReCaptchaEnterpriseProvider(environment.appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  cached = {
    auth: new FirebaseAuthConnector(clients.auth),
    functions: new FirebaseFunctionsConnector(clients.functions),
    documents: new FirebaseDocumentSource(clients.firestore),
    storage: new FirebaseStorageConnector(clients.storage),
    analytics: noopAnalytics,
  };
  return cached;
}
