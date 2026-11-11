import type { AccountsRepository } from "./accounts-google";
import type { Env } from "./google";
import { verifyFirebaseToken } from "./firebase-token";
export class MemberError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireMember(
  request: Request,
  env: Env,
  repo: AccountsRepository,
  now: Date,
  verify = verifyFirebaseToken,
  requireVerified = true,
) {
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new MemberError(401, "Inicia sesión para continuar.");
  let claims;
  try {
    claims = await verify(token, env.FIREBASE_PROJECT_ID, now);
  } catch {
    throw new MemberError(401, "Vuelve a iniciar sesión.");
  }
  const account = await repo.accountInfo(claims.sub);
  if (
    !account ||
    account.disabled ||
    claims.auth_time < account.validSince ||
    (await repo.get(`accountDeletion/${claims.sub}`, ["requestedAt"]))
  )
    throw new MemberError(403, "Esta cuenta no está disponible.");
  if (requireVerified && (!account.verified || !claims.email_verified))
    throw new MemberError(
      403,
      "Verifica tu correo antes de enviar una felicitación.",
    );
  return { uid: claims.sub, account };
}
