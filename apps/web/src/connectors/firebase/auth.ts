import { customClaimsSchema } from "@kampusagi/contracts";
import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { toAppError } from "../errors";
import type { AuthConnector, Session } from "../types";

async function toSession(user: User | null, forceRefresh = false): Promise<Session | null> {
  if (!user) return null;
  const token = await getIdTokenResult(user, forceRefresh);
  const claims = customClaimsSchema.safeParse({
    moderator: token.claims.moderator,
    verified: token.claims.verified,
    universityId: token.claims.universityId,
  });
  return {
    user: { uid: user.uid, email: user.email, emailVerified: user.emailVerified },
    claims: claims.success ? claims.data : {},
  };
}

export class FirebaseAuthConnector implements AuthConnector {
  constructor(private readonly auth: Auth) {}

  observeSession(listener: (session: Session | null) => void) {
    let active = true;
    let latest = 0;
    const stop = onIdTokenChanged(this.auth, (user) => {
      const sequence = ++latest;
      const deliver = (session: Session | null) => {
        if (active && sequence === latest) listener(session);
      };
      toSession(user).then(deliver, () => deliver(null));
    });
    return () => {
      active = false;
      stop();
    };
  }

  async refreshSession() {
    try {
      return await toSession(this.auth.currentUser, true);
    } catch (error) {
      throw toAppError(error);
    }
  }

  async signInWithEmail(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(this.auth, email.trim(), password);
    } catch (error) {
      throw toAppError(error);
    }
  }

  async signUpWithEmail(email: string, password: string) {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
      await sendEmailVerification(credential.user).catch(() => undefined);
    } catch (error) {
      throw toAppError(error);
    }
  }

  async sendPasswordReset(email: string) {
    try {
      await sendPasswordResetEmail(this.auth, email.trim());
    } catch (error) {
      if ((error as { code?: unknown }).code === "auth/user-not-found") return;
      throw toAppError(error);
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw toAppError(error);
    }
  }
}
