import { FieldValue } from "firebase-admin/firestore";
import { db } from "../lib/admin";
import { defineCallable } from "../lib/callable";
import { appError } from "../lib/errors";
import { newProfileDocuments } from "../profiles/documents";

export const completeOnboarding = defineCallable("completeOnboarding", {
  access: "signed-in",
  handler: async (input, caller) => {
    const firestore = db();
    const userRef = firestore.doc(`users/${caller.uid}`);
    const privateRef = firestore.doc(`userPrivate/${caller.uid}`);
    const universityRef = firestore.doc(`universities/${input.universityId}`);
    return firestore.runTransaction(async (transaction) => {
      const [university, existing] = await Promise.all([transaction.get(universityRef), transaction.get(userRef)]);
      if (!university.exists) throw appError("invalid-argument", "Seçilen üniversite bulunamadı.");
      if (existing.exists) {
        if (existing.get("universityId") !== input.universityId) {
          throw appError("failed-precondition", "Profilin zaten oluşturulmuş.");
        }
        return { created: false };
      }
      const documents = newProfileDocuments(input, FieldValue.serverTimestamp());
      transaction.create(userRef, documents.profile);
      transaction.create(privateRef, documents.private);
      return { created: true };
    });
  },
});

export const updateProfile = defineCallable("updateProfile", {
  access: "signed-in",
  handler: async (input, caller) => {
    const firestore = db();
    const userRef = firestore.doc(`users/${caller.uid}`);
    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists) throw appError("failed-precondition", "Önce profilini oluşturmalısın.");
      transaction.update(userRef, { ...input, updatedAt: FieldValue.serverTimestamp() });
    });
    return { updated: true as const };
  },
});
