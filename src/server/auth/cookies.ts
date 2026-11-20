import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, sessionService, type SessionPayload } from "./session";

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Logout — deletes the Redis-side session (not just the cookie), so the token can't be replayed if it leaked. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) await sessionService.destroy(token);
  store.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionService.verify(token);
}
