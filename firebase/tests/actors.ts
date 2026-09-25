import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";

export function actors(env: RulesTestEnvironment) {
  return {
    odtuA: env.authenticatedContext("odtuA", { verified: true, universityId: "odtu" }).firestore(),
    odtuB: env.authenticatedContext("odtuB", { verified: true, universityId: "odtu" }).firestore(),
    ituC: env.authenticatedContext("ituC", { verified: true, universityId: "itu" }).firestore(),
    odtuD: env.authenticatedContext("odtuD", { verified: true, universityId: "odtu" }).firestore(),
    ituE: env.authenticatedContext("ituE", { verified: true, universityId: "itu" }).firestore(),
    unverified: env.authenticatedContext("yeni").firestore(),
    fakeVerified: env.authenticatedContext("sahte", { verified: "true", universityId: "odtu" }).firestore(),
    moderator: env.authenticatedContext("mod", { moderator: true }).firestore(),
    anonymous: env.unauthenticatedContext().firestore(),
  };
}
