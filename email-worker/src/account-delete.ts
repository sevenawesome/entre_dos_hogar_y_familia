import type { AccountsRepository } from "./accounts-google";
import type { Env, Write } from "./google";
import { cleanAccountPage } from "./account-cleanup";
import { accountsHeaders } from "./account-admin";
import { MemberError } from "./member-auth";
import { verifyFirebaseToken } from "./firebase-token";

const validUid = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
export async function stepOwnDeletion(
  repo: AccountsRepository,
  uid: string,
  now = new Date(),
) {
  const job = await repo.get(`selfDeletionJobs/${uid}`);
  if (!job || job.data.state === "complete") return "complete";
  if (Number(job.data.leaseUntil) > now.getTime()) return "queued";
  const lease = crypto.randomUUID();
  if (
    !(await repo.commit([
      {
        path: job.path,
        version: job.version,
        data: { ...job.data, lease, leaseUntil: now.getTime() + 60000 },
      },
    ]))
  )
    return "queued";
  try {
    const complete = await cleanAccountPage(repo, uid);
    const fresh = await repo.get(job.path);
    if (fresh?.data.lease === lease) {
      await repo.commit([
        {
          path: fresh.path,
          version: fresh.version,
          data: {
            state: complete ? "complete" : "queued",
            requestedAt: job.data.requestedAt,
            updatedAt: now,
            lease: null,
            leaseUntil: null,
          },
        },
      ]);
    }
    return complete ? "complete" : "queued";
  } catch {
    const fresh = await repo.get(job.path);
    if (fresh?.data.lease === lease)
      await repo.commit([
        {
          path: fresh.path,
          version: fresh.version,
          data: {
            ...fresh.data,
            lease: null,
            leaseUntil: null,
            updatedAt: now,
          },
        },
      ]);
    return "queued";
  }
}
export async function ownDeletionCycle(
  repo: AccountsRepository,
  now = new Date(),
) {
  const jobs = await repo.query(
    "selfDeletionJobs",
    [{ field: "state", op: "EQUAL", value: "queued" }],
    1,
    undefined,
    "updatedAt",
  );
  if (jobs[0])
    await stepOwnDeletion(repo, jobs[0].path.split("/").at(-1)!, now);
  return !!jobs[0];
}
export async function requestOwnDeletion(
  repo: AccountsRepository,
  uid: string,
  input: Record<string, unknown>,
  now = new Date(),
) {
  if (input.confirmation !== "ELIMINAR MI CUENTA")
    throw new MemberError(400, "Escribe ELIMINAR MI CUENTA para confirmar.");
  const existing = await repo.get(`accountDeletion/${uid}`);
  if (existing) {
    if (existing.data.source !== "self")
      throw new MemberError(409, "La cuenta ya está en eliminación.");
    return { accepted: true, state: await stepOwnDeletion(repo, uid, now) };
  }
  const account = await repo.accountInfo(uid);
  if (
    !account ||
    account.disabled ||
    (await repo.get(`accountSuspensions/${uid}`))
  )
    throw new MemberError(403, "Esta cuenta no está disponible.");
  if (!(await repo.canDeleteAccounts()))
    throw new MemberError(
      503,
      "El servicio no pudo habilitar la eliminación. No se ha borrado tu cuenta; vuelve a intentarlo.",
    );
  const [role, profile] = await Promise.all([
    repo.get(`roles/${uid}`),
    repo.get(`community/${uid}`),
  ]);
  const writes: Write[] = [
    {
      path: `accountDeletion/${uid}`,
      version: null,
      data: { requestedAt: now, source: "self" },
    },
    {
      path: `selfDeletionJobs/${uid}`,
      version: null,
      data: {
        state: "queued",
        requestedAt: now,
        updatedAt: now,
        lease: null,
        leaseUntil: null,
      },
    },
    ...(profile
      ? [
          {
            path: profile.path,
            version: profile.version,
            data: {
              ...profile.data,
              visible: false,
              avatar: null,
              people: [],
              moderationStatus: "private",
              updatedAt: now,
            },
          },
        ]
      : []),
  ];
  if (role?.data.role === "owner") {
    const successor = input.successorUid;
    if (!validUid(successor) || successor === uid)
      throw new MemberError(
        400,
        "Selecciona otro administrador para conservar la administración del programa.",
      );
    const [nextRole, nextAccount, deleting, suspended] = await Promise.all([
      repo.get(`roles/${successor}`),
      repo.accountInfo(successor),
      repo.get(`accountDeletion/${successor}`),
      repo.get(`accountSuspensions/${successor}`),
    ]);
    if (
      nextRole?.data.role !== "admin" ||
      !nextAccount?.verified ||
      nextAccount.disabled ||
      deleting ||
      suspended
    )
      throw new MemberError(
        409,
        "El sucesor debe ser otro administrador activo con correo verificado.",
      );
    writes.push(
      {
        path: nextRole.path,
        version: nextRole.version,
        data: { ...nextRole.data, role: "owner" },
      },
      {
        path: role.path,
        version: role.version,
        data: { ...role.data, role: "member", permissions: [] },
      },
      {
        path: `adminAudit/${crypto.randomUUID()}`,
        version: null,
        data: {
          actorUid: uid,
          action: "owner.transfer",
          target: successor,
          at: now,
        },
      },
    );
  } else
    writes.push({
      path: `roles/${uid}`,
      version: role?.version ?? null,
      data: role?.data ?? { role: "member" },
    });
  if (!(await repo.commit(writes)))
    throw new MemberError(
      409,
      "La cuenta cambió. Revisa la confirmación y vuelve a intentarlo.",
    );
  return { accepted: true, state: await stepOwnDeletion(repo, uid, now) };
}
export async function selfDeletionRequest(
  request: Request,
  env: Env,
  repo: AccountsRepository,
  verify = verifyFirebaseToken,
  now = new Date(),
) {
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: accountsHeaders });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: accountsHeaders });
  try {
    if (request.method !== "POST")
      throw new MemberError(405, "Acción no permitida.");
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new MemberError(401, "Inicia sesión para continuar.");
    let claims;
    try {
      claims = await verify(token, env.FIREBASE_PROJECT_ID, now);
    } catch {
      throw new MemberError(
        401,
        "Vuelve a iniciar sesión antes de eliminar la cuenta.",
      );
    }
    if (now.getTime() / 1000 - claims.auth_time > 300)
      throw new MemberError(
        401,
        "Confirma tu contraseña otra vez; esta acción requiere un acceso reciente.",
      );
    const live = await repo.accountInfo(claims.sub);
    if (live && claims.auth_time < live.validSince)
      throw new MemberError(401, "Vuelve a iniciar sesión.");
    const raw = await request.text();
    if (raw.length > 2048)
      throw new MemberError(400, "Solicitud demasiado grande.");
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new MemberError(400, "Solicitud inválida.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new MemberError(400, "Solicitud inválida.");
    const result = await requestOwnDeletion(repo, claims.sub, input, now);
    return json(result, result.state === "complete" ? 200 : 202);
  } catch (error) {
    return json(
      {
        error:
          error instanceof MemberError
            ? error.message
            : "No se pudo solicitar la eliminación. Vuelve a intentarlo.",
      },
      error instanceof MemberError ? error.status : 503,
    );
  }
}
