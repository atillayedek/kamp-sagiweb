import { FUNCTIONS_REGION } from "@kampusagi/contracts";
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

export type EmulatorHosts = {
  host: string;
  authPort: number;
  firestorePort: number;
  functionsPort: number;
  storagePort: number;
};

export const defaultEmulatorHosts: EmulatorHosts = {
  host: "127.0.0.1",
  authPort: 9099,
  firestorePort: 8080,
  functionsPort: 5001,
  storagePort: 9199,
};

export type FirebaseClients = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
};

export function createFirebaseClients(
  options: FirebaseOptions,
  settings: { appName?: string; emulators?: EmulatorHosts } = {},
): FirebaseClients {
  const name = settings.appName ?? "[DEFAULT]";
  const app = getApps().find((existing) => existing.name === name) ?? initializeApp(options, name);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const storage = getStorage(app);
  const emulators = settings.emulators;
  if (emulators && !(auth.emulatorConfig ?? null)) {
    connectAuthEmulator(auth, `http://${emulators.host}:${emulators.authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(firestore, emulators.host, emulators.firestorePort);
    connectFunctionsEmulator(functions, emulators.host, emulators.functionsPort);
    connectStorageEmulator(storage, emulators.host, emulators.storagePort);
  }
  return { app, auth, firestore, functions, storage };
}
