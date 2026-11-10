import type { AccountsRepository, AuthAccount } from "./accounts-google";
import { verifyFirebaseToken, type FirebaseClaims } from "./firebase-token";
import type { Data, Document, Env, Write } from "./google";

const validUid = (uid: unknown): uid is string =>
  typeof uid === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(uid);
const jobPath = (id: string) => `adminDeletionJobs/${id}`;
const confirmation = (n: number) =>
  `ELIMINAR ${n} ${n === 1 ? "CUENTA" : "CUENTAS"}`;
export const accountsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
interface DeletionJob extends Data {
  actorUid: string;
  targets: string[];
  state: "preview" | "queued" | "complete" | "blocked";
  index: number;
  skipped: number;
  createdAt: Date;
  expiresAt: Date;
  leaseUntil: Date | null;
  leaseId: string | null;
  error: string | null;
}
function status(d: Document<DeletionJob>) {
  const j = d.data;
  return {
    id: d.path.split("/").at(-1)!,
    total: j.targets.length,
    processed: j.index,
    deleted: j.index - j.skipped,
    skipped: j.skipped,
    state: j.state,
    confirmation: confirmation(j.targets.length),
    error: j.error,
  };
}
async function protectedAccount(
  repo: AccountsRepository,
  uid: string,
  actor: string,
) {
  if (uid === actor) return true;
  const role = await repo.get(`roles/${uid}`, ["role"]);
  return !!role && role.data.role !== "member";
}
async function isOwner(repo: AccountsRepository, uid: string) {
  const [role, account, deleting] = await Promise.all([
    repo.get(`roles/${uid}`, ["role"]),
    repo.accountInfo(uid),
    repo.get(`accountDeletion/${uid}`, ["requestedAt"]),
  ]);
  return (
    role?.data.role === "owner" &&
    !!account &&
    !account.disabled &&
    account.verified &&
    !deleting
  );
}
async function readJob(repo: AccountsRepository, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new HttpError(400, "Proceso inválido.");
  const job = await repo.get<DeletionJob>(jobPath(id));
  if (!job) throw new HttpError(404, "No encontramos ese proceso.");
  if (
    !Array.isArray(job.data.targets) ||
    !job.data.targets.every(validUid) ||
    job.data.targets.length > 5000
  )
    throw new HttpError(409, "El proceso contiene datos inválidos.");
  return job;
}
export async function previewDeletion(
  repo: AccountsRepository,
  actor: string,
  input: { scope?: unknown; uid?: unknown },
  now: Date,
) {
  let accounts: AuthAccount[] = [];
  const protectedIds = new Set([actor]);
  if (input.scope === "one") {
    if (!validUid(input.uid))
      throw new HttpError(400, "Selecciona una cuenta válida.");
    if (await protectedAccount(repo, input.uid, actor))
      throw new HttpError(
        403,
        "El propietario y los administradores están protegidos. Retira primero el rol de otro administrador si necesitas eliminar su cuenta.",
      );
    const account = await repo.accountInfo(input.uid);
    if (!account) throw new HttpError(404, "La cuenta ya no existe.");
    accounts = [account];
  } else if (input.scope === "all") {
    const roles = await repo.query("roles", [], 1001, ["role"]);
    if (roles.length > 1000)
      throw new HttpError(
        409,
        "Hay demasiados permisos para comprobar en un solo reinicio. Usa la eliminación individual.",
      );
    for (const role of roles)
      if (role.data.role !== "member")
        protectedIds.add(role.path.split("/").at(-1)!);
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const result = await repo.listAccounts(cursor ?? undefined, 1000);
      accounts.push(...result.accounts);
      cursor = result.cursor;
      if (!cursor) break;
    }
    if (cursor)
      throw new HttpError(
        409,
        "El reinicio admite hasta 5000 cuentas por operación. Solicita mantenimiento para un volumen mayor.",
      );
  } else
    throw new HttpError(400, "Elige una cuenta o el reinicio de familias.");
  const eligible = accounts.filter((a) => !protectedIds.has(a.uid));
  if (!eligible.length)
    throw new HttpError(
      409,
      "No hay cuentas de familias para eliminar. Las cuentas administrativas se conservan.",
    );
  if (!eligible.every((a) => validUid(a.uid)))
    throw new HttpError(
      409,
      "Hay identificadores de cuenta no compatibles con este reinicio.",
    );
  const id = crypto.randomUUID(),
    path = jobPath(id),
    data: DeletionJob = {
      actorUid: actor,
      targets: eligible.map((a) => a.uid),
      state: "preview",
      index: 0,
      skipped: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60000),
      leaseUntil: null,
      leaseId: null,
      error: null,
    };
  if (!(await repo.commit([{ path, data, version: null }])))
    throw new HttpError(409, "Vuelve a preparar la vista previa.");
  return {
    job: status({ path, data, version: "" }),
    sample: eligible.slice(0, 10).map((a) => ({ uid: a.uid, email: a.email })),
    protectedCount: accounts.length - eligible.length,
  };
}
export async function confirmDeletion(
  repo: AccountsRepository,
  id: string,
  actor: string,
  text: unknown,
  now: Date,
) {
  const job = await readJob(repo, id),
    j = job.data;
  if (j.actorUid !== actor)
    throw new HttpError(403, "Este proceso pertenece a otro propietario.");
  if (j.state !== "preview") return status(job); // A repeated confirmation never creates a second job.
  if (j.expiresAt.getTime() <= now.getTime())
    throw new HttpError(409, "La vista previa venció. Prepara una nueva.");
  if (text !== confirmation(j.targets.length))
    throw new HttpError(400, "La confirmación escrita no coincide.");
  const next = { ...j, state: "queued" as const, error: null };
  if (
    !(await repo.commit([
      { path: job.path, version: job.version, data: next },
      {
        path: `adminAudit/${id}-requested`,
        version: null,
        data: {
          actorUid: actor,
          action: "accounts.deletion.request",
          target: job.path,
          at: now,
          count: j.targets.length,
        },
      },
    ]))
  )
    throw new HttpError(409, "El proceso cambió. Actualiza su estado.");
  return status({ ...job, data: next });
}
export async function stepDeletionJob(
  repo: AccountsRepository,
  id: string,
  now = new Date(),
) {
  let job = await readJob(repo, id),
    j = job.data;
  if (
    j.state !== "queued" ||
    (j.leaseUntil && j.leaseUntil.getTime() > now.getTime())
  )
    return status(job);
  if (!(await isOwner(repo, j.actorUid))) {
    await repo.commit([
      {
        path: job.path,
        version: job.version,
        data: {
          ...j,
          state: "blocked",
          error: "El propietario ya no tiene una cuenta administrativa activa.",
        },
      },
    ]);
    return status(await readJob(repo, id));
  }
  const leaseId = crypto.randomUUID();
  if (
    !(await repo.commit([
      {
        path: job.path,
        version: job.version,
        data: {
          ...j,
          leaseId,
          leaseUntil: new Date(now.getTime() + 60000),
          error: null,
        },
      },
    ]))
  )
    return status(await readJob(repo, id));
  job = await readJob(repo, id);
  j = job.data;
  try {
    if (j.index < j.targets.length) {
      const uid = j.targets[j.index];
      let skip = await protectedAccount(repo, uid, j.actorUid);
      if (!skip) {
        const marker = await repo.get(`accountDeletion/${uid}`, [
          "requestedAt",
        ]);
        if (
          !marker &&
          !(await repo.commit([
            {
              path: `accountDeletion/${uid}`,
              version: null,
              data: { requestedAt: now, source: "administration", jobId: id },
            },
          ]))
        )
          throw Error("La cuenta cambió. Vuelve a intentar.");
        // Once marked, Firestore rules prevent client writes and new role grants.
        // Recheck after the marker to close the promotion/marking race.
        skip = await protectedAccount(repo, uid, j.actorUid);
        if (skip && !marker) {
          const ownMarker = await repo.get(`accountDeletion/${uid}`);
          if (ownMarker?.data.jobId === id)
            await repo.removeDocuments([
              { path: ownMarker.path, version: ownMarker.version },
            ]);
        }
        if (!skip) {
          await repo.deleteAuth(uid); // No Firestore data is removed if Auth deletion is denied.
          const pages = await Promise.all([
            ...["progress", "devices", "inbox", "levelNews"].map((c) =>
              repo.query(`families/${uid}/${c}`, [], 25, ["__name__"]),
            ),
            ...["emailQueue", "mailJobs", "mailEvents"].map((c) =>
              repo.query(c, [{ field: "uid", op: "EQUAL", value: uid }], 25, [
                "__name__",
              ]),
            ),
          ]);
          const allLoaded = pages.every((p) => p.length < 25);
          const paths = pages.flat().map((d) => ({ path: d.path }));
          if (allLoaded)
            for (const root of [
              "community",
              "avatars",
              "portraits",
              "journeys",
              "tracking",
              "familyControls",
              "emailPreferences",
              "families",
              "roles",
            ])
              paths.push({ path: `${root}/${uid}` });
          if (!(await repo.removeDocuments(paths)))
            throw Error("La limpieza necesita otro intento.");
          if (!allLoaded) {
            await repo.commit([
              {
                path: job.path,
                version: job.version,
                data: { ...j, leaseId: null, leaseUntil: null },
              },
            ]);
            return status(await readJob(repo, id));
          }
        }
      }
      j = { ...j, index: j.index + 1, skipped: j.skipped + (skip ? 1 : 0) };
    }
    const done = j.index >= j.targets.length;
    const next = {
      ...j,
      state: done ? ("complete" as const) : ("queued" as const),
      leaseId: null,
      leaseUntil: null,
      error: null,
    };
    const writes: Write[] = [
      { path: job.path, version: job.version, data: next },
    ];
    if (done)
      writes.push({
        path: `adminAudit/${id}-completed`,
        version: null,
        data: {
          actorUid: j.actorUid,
          action: "accounts.deletion.complete",
          target: job.path,
          at: now,
          deleted: j.index - j.skipped,
          skipped: j.skipped,
        },
      });
    await repo.commit(writes);
  } catch {
    const fresh = await readJob(repo, id);
    if (fresh.data.leaseId === leaseId)
      await repo.commit([
        {
          path: job.path,
          version: fresh.version,
          data: {
            ...fresh.data,
            leaseId: null,
            leaseUntil: null,
            error:
              "No se pudo completar la limpieza. Comprueba el servicio y pulsa Reanudar.",
          },
        },
      ]);
  }
  return status(await readJob(repo, id));
}
export async function deletionCycle(
  repo: AccountsRepository,
  env: Env,
  now = new Date(),
) {
  if (env.ADMIN_ACCOUNTS_ENABLED !== "true") return;
  const jobs = await repo.query<DeletionJob>(
    "adminDeletionJobs",
    [{ field: "state", op: "EQUAL", value: "queued" }],
    1,
  );
  if (jobs[0])
    await stepDeletionJob(repo, jobs[0].path.split("/").at(-1)!, now);
}
export async function handleAccountsRequest(
  request: Request,
  env: Env,
  repo: AccountsRepository,
  verify: typeof verifyFirebaseToken = verifyFirebaseToken,
  now = new Date(),
) {
  const json = (data: unknown, statusCode = 200) =>
    Response.json(data, { status: statusCode, headers: accountsHeaders });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: accountsHeaders });
  if (env.ADMIN_ACCOUNTS_ENABLED !== "true")
    return json(
      { error: "El servicio de cuentas todavía no está habilitado." },
      503,
    );
  try {
    const bearer = request.headers
      .get("Authorization")
      ?.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!bearer) throw new HttpError(401, "Inicia sesión como propietario.");
    let claims: FirebaseClaims;
    try {
      claims = await verify(bearer, env.FIREBASE_PROJECT_ID, now);
    } catch {
      throw new HttpError(
        401,
        "La sesión no se pudo verificar. Vuelve a iniciar sesión.",
      );
    }
    const account = await repo.accountInfo(claims.sub);
    if (
      !account ||
      account.disabled ||
      !account.verified ||
      !claims.email_verified ||
      claims.auth_time < account.validSince ||
      !(await isOwner(repo, claims.sub))
    )
      throw new HttpError(
        403,
        "Solo el propietario con correo verificado puede administrar eliminaciones.",
      );
    const url = new URL(request.url),
      path = url.pathname;
    if (request.method === "GET" && path === "/admin/accounts") {
      const cursor = url.searchParams.get("cursor") ?? "";
      if (cursor.length > 4096) throw new HttpError(400, "Página inválida.");
      const page = await repo.listAccounts(cursor, 10);
      const rows = await Promise.all(
        page.accounts.map(async (a) => {
          if (!validUid(a.uid))
            return {
              uid: a.uid,
              email: a.email,
              name: "Identificador no compatible con la gestión automática",
              protected: true,
            };
          const [family, role] = await Promise.all([
            repo.get(`families/${a.uid}`, ["name"]),
            repo.get(`roles/${a.uid}`, ["role"]),
          ]);
          return {
            uid: a.uid,
            email: a.email,
            name:
              typeof family?.data.name === "string"
                ? family.data.name
                : "Sin perfil familiar",
            protected:
              a.uid === claims.sub || (!!role && role.data.role !== "member"),
          };
        }),
      );
      return json({ rows, cursor: page.cursor });
    }
    if (request.method === "GET" && path === "/admin/accounts/jobs") {
      const jobs = await repo.query<DeletionJob>(
        "adminDeletionJobs",
        [{ field: "actorUid", op: "EQUAL", value: claims.sub }],
        50,
      );
      return json({
        jobs: jobs
          .filter((j) => j.data.state !== "preview")
          .sort(
            (a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime(),
          )
          .map(status),
      });
    }
    const match = path.match(
      /^\/admin\/accounts\/jobs\/([a-f0-9-]{36})(?:\/(confirm|step))?$/,
    );
    if (request.method === "GET" && match) {
      const job = await readJob(repo, match[1]);
      if (job.data.actorUid !== claims.sub)
        throw new HttpError(403, "Proceso no disponible.");
      return json({ job: status(job) });
    }
    if (request.method !== "POST")
      throw new HttpError(405, "Acción no permitida.");
    const text = await request.text();
    if (text.length > 4096)
      throw new HttpError(400, "Solicitud demasiado grande.");
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      throw new HttpError(400, "Solicitud inválida.");
    }
    if (path === "/admin/accounts/preview") {
      if (!(await repo.canDeleteAccounts()))
        throw new HttpError(
          503,
          "El servicio todavía no tiene habilitada la eliminación de cuentas. Las cuentas no se han modificado.",
        );
      return json(await previewDeletion(repo, claims.sub, body, now));
    }
    if (match) {
      const job = await readJob(repo, match[1]);
      if (job.data.actorUid !== claims.sub)
        throw new HttpError(403, "Proceso no disponible.");
      if (match[2] === "confirm") {
        if (!(await repo.canDeleteAccounts()))
          throw new HttpError(
            503,
            "El servicio no tiene permiso para eliminar cuentas. No se inició la limpieza.",
          );
        if (now.getTime() / 1000 - claims.auth_time > 300)
          throw new HttpError(
            401,
            "Para confirmar una eliminación, cierra sesión y vuelve a entrar. La confirmación requiere un acceso de los últimos cinco minutos.",
          );
        return json({
          job: await confirmDeletion(
            repo,
            match[1],
            claims.sub,
            body.confirmation,
            now,
          ),
        });
      }
      if (match[2] === "step")
        return json({ job: await stepDeletionJob(repo, match[1], now) });
    }
    throw new HttpError(404, "Acción no encontrada.");
  } catch (e) {
    return json(
      {
        error:
          e instanceof HttpError
            ? e.message
            : "No pudimos completar la solicitud. Vuelve a intentarlo.",
      },
      e instanceof HttpError ? e.status : 503,
    );
  }
}
