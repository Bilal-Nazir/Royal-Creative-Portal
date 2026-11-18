import { userRepository } from "../repositories/container";
import { verifyPassword } from "../auth/password";
import { sessionService, type SessionPayload } from "../auth/session";
import { isAgencyUser } from "../domain/user";

export type SignInResult =
  | { ok: true; token: string; session: SessionPayload }
  | { ok: false; error: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const user = await userRepository.findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }

  const session: SessionPayload = isAgencyUser(user)
    ? { userId: user.id, role: "agency", name: user.name, agencyRole: user.agencyRole }
    : { userId: user.id, role: "client", name: user.name, clientRole: user.clientRole, clientId: user.clientId };

  const token = await sessionService.create(session);
  return { ok: true, token, session };
}

export function roleHomePath(session: SessionPayload): string {
  return session.role === "agency" ? "/agency/dashboard" : "/dashboard";
}
