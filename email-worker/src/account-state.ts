import type { AccountsRepository } from "./accounts-google";
import { requireMember, MemberError } from "./member-auth";
import { verifyFirebaseToken } from "./firebase-token";
import type { Env } from "./google";
import { accountsHeaders } from "./account-admin";
export async function finishSuspension(
  repo: AccountsRepository,
  uid: string,
  now = new Date(),
) {
  const marker = await repo.get(`accountSuspensions/${uid}`);
  if (!marker || marker.data.state === "disabled") return;
  if (
    marker.data.state === "disabling" &&
    Number(marker.data.leaseUntil) > now.getTime()
  )
    return;
  const leaseId = crypto.randomUUID();
  if (await repo.get(`accountDeletion/${uid}`)) return;
  const [family, community] = await Promise.all([
    repo.get(`families/${uid}`),
    repo.get(`community/${uid}`),
  ]);
  if (
    !(await repo.commit([
      {
        path: marker.path,
        version: marker.version,
        data: {
          ...marker.data,
          state: "disabling",
          leaseId,
          leaseUntil: now.getTime() + 60000,
          updatedAt: now,
        },
      },
      ...(family
        ? [
            {
              path: family.path,
              version: family.version,
              data: { ...family.data, accountDisabled: true },
            },
          ]
        : []),
      ...(community
        ? [
            {
              path: community.path,
              version: community.version,
              data: {
                ...community.data,
                visible: false,
                avatar: null,
                people: [],
                updatedAt: now,
              },
            },
          ]
        : []),
    ]))
  )
    throw Error("La cuenta cambió; vuelve a intentarlo.");
  await repo.setDisabled(uid, true);
  const fresh = await repo.get(marker.path);
  if (fresh?.data.leaseId === leaseId)
    await repo.commit([
      {
        path: fresh.path,
        version: fresh.version,
        data: {
          ...fresh.data,
          state: "disabled",
          leaseId: null,
          leaseUntil: null,
          updatedAt: now,
        },
      },
    ]);
}
export async function suspendOwnAccount(
  repo: AccountsRepository,
  uid: string,
  now = new Date(),
) {
  const role = await repo.get(`roles/${uid}`, ["role"]);
  if (role?.data.role === "owner")
    throw new MemberError(
      403,
      "La cuenta propietaria está protegida y no puede desactivarse.",
    );
  if (await repo.get(`accountDeletion/${uid}`))
    throw new MemberError(409, "La cuenta ya está en eliminación total.");
  const path = `accountSuspensions/${uid}`,
    old = await repo.get(path);
  if (!old) {
    const profile = await repo.get(`community/${uid}`, ["visible"]);
    if (
      !(await repo.commit([
        {
          path,
          version: null,
          data: {
            state: "pending",
            requestedAt: now,
            updatedAt: now,
            requestedBy: uid,
            previouslyVisible: profile?.data.visible === true,
          },
        },
      ]))
    )
      throw new MemberError(409, "Vuelve a intentarlo.");
  }
  await finishSuspension(repo, uid, now);
  return { ok: true };
}
export async function restoreAccount(
  repo: AccountsRepository,
  uid: string,
  actor: string,
  now = new Date(),
) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid))
    throw new MemberError(400, "Cuenta inválida.");
  if (await repo.get(`accountDeletion/${uid}`))
    throw new MemberError(409, "La eliminación total no se puede restablecer.");
  const marker = await repo.get(`accountSuspensions/${uid}`);
  if (!marker)
    throw new MemberError(
      409,
      "Esta cuenta no tiene una desactivación recuperable.",
    );
  if (marker.data.state !== "disabled")
    throw new MemberError(
      409,
      "La desactivación todavía se está completando. Actualiza en un momento.",
    );
  if (!(await repo.accountInfo(uid)))
    throw new MemberError(
      409,
      "La cuenta de acceso ya fue eliminada y no se puede recuperar.",
    );
  await repo.setDisabled(uid, false);
  const family = await repo.get(`families/${uid}`);
  if (
    family &&
    !(await repo.commit([
      {
        path: family.path,
        version: family.version,
        data: { ...family.data, accountDisabled: false },
      },
    ]))
  )
    throw new MemberError(
      409,
      "Vuelve a restablecer para completar el cambio.",
    );
  // Community remains private after restoration; the family chooses to participate again.
  if (
    !(await repo.removeDocuments([
      { path: marker.path, version: marker.version },
    ]))
  )
    throw new MemberError(409, "La cuenta cambió. Vuelve a intentarlo.");
  await repo.commit([
    {
      path: `adminAudit/${crypto.randomUUID()}`,
      version: null,
      data: {
        actorUid: actor,
        action: "account.restore",
        target: uid,
        at: now,
      },
    },
  ]);
  return { ok: true };
}
export async function suspensionCycle(
  repo: AccountsRepository,
  now = new Date(),
) {
  const markers = await repo.query(
    "accountSuspensions",
    [{ field: "state", op: "EQUAL", value: "pending" }],
    1,
  );
  const retry =
    markers[0] ??
    (
      await repo.query(
        "accountSuspensions",
        [{ field: "state", op: "EQUAL", value: "disabling" }],
        1,
      )
    )[0];
  if (retry) await finishSuspension(repo, retry.path.split("/").at(-1)!, now);
}
export async function selfAccountStateRequest(
  request: Request,
  env: Env,
  repo: AccountsRepository,
  verify = verifyFirebaseToken,
  now = new Date(),
) {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: accountsHeaders });
  try {
    if (request.method !== "POST")
      throw new MemberError(405, "Acción no permitida.");
    const actor = await requireMember(request, env, repo, now, verify, false);
    // requireMember validates the live account; a fresh token is required for this action.
    const bearer = request.headers.get("Authorization")!.slice(7),
      claims = await verify(bearer, env.FIREBASE_PROJECT_ID, now);
    if (now.getTime() / 1000 - claims.auth_time > 300)
      throw new MemberError(
        401,
        "Vuelve a iniciar sesión antes de desactivar la cuenta.",
      );
    return Response.json(await suspendOwnAccount(repo, actor.uid, now), {
      headers: accountsHeaders,
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof MemberError
            ? e.message
            : "No se pudo completar la desactivación. Vuelve a intentarlo.",
      },
      {
        status: e instanceof MemberError ? e.status : 503,
        headers: accountsHeaders,
      },
    );
  }
}
