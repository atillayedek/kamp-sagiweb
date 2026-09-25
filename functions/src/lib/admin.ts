import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function adminApp() {
  return getApps()[0] ?? initializeApp();
}

export function db() {
  return getFirestore(adminApp());
}
