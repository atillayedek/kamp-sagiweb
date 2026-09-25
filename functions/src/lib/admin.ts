import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export function adminApp() {
  return getApps()[0] ?? initializeApp();
}

export function db() {
  return getFirestore(adminApp());
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function defaultBucket() {
  return getStorage(adminApp()).bucket();
}
export type Bucket = ReturnType<typeof defaultBucket>;
