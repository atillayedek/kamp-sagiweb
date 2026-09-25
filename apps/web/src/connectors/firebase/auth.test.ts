import type { Auth, User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../types";

type TokenResult = { claims: Record<string, unknown> };

const state = vi.hoisted(() => ({
  emit: (() => undefined) as (user: unknown) => void,
  stopped: false,
  pending: new Map<string, (value: TokenResult) => void>(),
}));

vi.mock("firebase/auth", () => ({
  onIdTokenChanged: (_auth: unknown, callback: (user: unknown) => void) => {
    state.emit = callback;
    return () => {
      state.stopped = true;
    };
  },
  getIdTokenResult: (user: { uid: string }) =>
    new Promise<TokenResult>((resolve) => state.pending.set(user.uid, resolve)),
  signOut: vi.fn(),
}));

const { FirebaseAuthConnector } = await import("./auth");

function user(uid: string) {
  return { uid, email: `${uid}@example.com`, emailVerified: true } as unknown as User;
}

beforeEach(() => {
  state.pending.clear();
  state.stopped = false;
});

describe("FirebaseAuthConnector.observeSession", () => {
  it("çıkıştan sonra geç gelen eski oturumu bildirmez", async () => {
    const seen: Array<Session | null> = [];
    new FirebaseAuthConnector({} as Auth).observeSession((session) => seen.push(session));
    state.emit(user("eski"));
    state.emit(null);
    await Promise.resolve();
    state.pending.get("eski")?.({ claims: { verified: true, universityId: "odtu" } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen).toEqual([null]);
  });

  it("geçersiz claim türlerini yok sayar", async () => {
    const seen: Array<Session | null> = [];
    new FirebaseAuthConnector({} as Auth).observeSession((session) => seen.push(session));
    state.emit(user("u1"));
    state.pending.get("u1")?.({ claims: { moderator: "evet" } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen[0]?.claims).toEqual({});
  });

  it("abonelik bitince dinleyiciyi çağırmaz ve Firebase aboneliğini kapatır", async () => {
    const seen: Array<Session | null> = [];
    const stop = new FirebaseAuthConnector({} as Auth).observeSession((session) => seen.push(session));
    state.emit(user("u2"));
    stop();
    state.pending.get("u2")?.({ claims: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen).toEqual([]);
    expect(state.stopped).toBe(true);
  });
});
