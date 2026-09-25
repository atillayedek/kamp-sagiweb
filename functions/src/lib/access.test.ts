import { pingRequestSchema } from "@kampusagi/contracts";
import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import { parseRequest, resolveCaller } from "./access";

function thrown(fn: () => unknown): HttpsError {
  try {
    fn();
  } catch (error) {
    if (error instanceof HttpsError) return error;
  }
  throw new Error("HttpsError bekleniyordu");
}

const verifiedToken = { verified: true, universityId: "odtu" };

describe("resolveCaller", () => {
  it("oturumsuz isteği reddeder", () => {
    const error = thrown(() => resolveCaller(undefined, "signed-in"));
    expect(error.code).toBe("unauthenticated");
    expect(error.details).toEqual({ appCode: "unauthenticated" });
  });

  it("oturumlu kullanıcıyı kabul eder", () => {
    expect(resolveCaller({ uid: "u1", token: {} }, "signed-in")).toEqual({ uid: "u1", claims: {} });
  });

  it("doğrulanmamış kullanıcıyı doğrulama gerektiren işlemde reddeder", () => {
    const error = thrown(() => resolveCaller({ uid: "u1", token: { verified: false } }, "verified"));
    expect(error.code).toBe("permission-denied");
    expect(error.details).toEqual({ appCode: "not-verified" });
  });

  it("universityId claim'i olmayan doğrulanmış kullanıcıyı reddeder", () => {
    expect(thrown(() => resolveCaller({ uid: "u1", token: { verified: true } }, "verified")).details).toEqual({
      appCode: "not-verified",
    });
  });

  it("doğrulanmış kullanıcıyı kabul eder", () => {
    expect(resolveCaller({ uid: "u1", token: verifiedToken }, "verified").claims).toEqual(verifiedToken);
  });

  it("moderatör olmayanı moderatör işleminde reddeder", () => {
    expect(thrown(() => resolveCaller({ uid: "u1", token: verifiedToken }, "moderator")).code).toBe("permission-denied");
  });

  it("claim türü bozuksa yetki vermez", () => {
    expect(thrown(() => resolveCaller({ uid: "u1", token: { moderator: "true" } }, "moderator")).code).toBe(
      "permission-denied",
    );
  });

  it("istemcinin gönderdiği veri yetki kaynağı değildir", () => {
    expect(thrown(() => resolveCaller({ uid: "u1", token: { isAdmin: true } }, "moderator")).code).toBe(
      "permission-denied",
    );
  });
});

describe("parseRequest", () => {
  it("şemaya uymayan girdiyi invalid-argument ile reddeder", () => {
    expect(thrown(() => parseRequest(pingRequestSchema, { moderator: true })).code).toBe("invalid-argument");
  });

  it("geçerli girdiyi döndürür", () => {
    expect(parseRequest(pingRequestSchema, {})).toEqual({});
  });
});
