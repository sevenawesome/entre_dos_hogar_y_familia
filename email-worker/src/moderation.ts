import {
  COMMUNITY_TERMS_VERSION,
  acceptableCommunityText,
  reportReasons,
} from "../../src/domain/community-safety";
import { hasPermission } from "../../src/domain/admin-permissions";
import type { AccountsRepository } from "./accounts-google";
import type { Env, Document, Write } from "./google";
import { MemberError, requireMember } from "./member-auth";
import { accountsHeaders } from "./account-admin";
import { verifyFirebaseToken } from "./firebase-token";

const uidValid = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
export async function safetyId(parts: string[]) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(parts)),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function communityRelation(
  repo: AccountsRepository,
  a: string,
  b: string,
) {
  const ids = [a, b].sort();
  const path = `communityRelations/${await safetyId(ids)}`;
  const relation = await repo.get(path);
  return {
    path,
    version: relation?.version ?? null,
    data: relation?.data ?? { aUid: ids[0], bUid: ids[1], blockedBy: [] },
  };
}
export const relationBlocked = (relation: { data: Record<string, unknown> }) =>
  Array.isArray(relation.data.blockedBy) && relation.data.blockedBy.length > 0;
export async function eligibleCommunityMember(
  repo: AccountsRepository,
  uid: string,
) {
  const [approval, consent, deleted, suspended] = await Promise.all([
    repo.get(`communityApprovals/${uid}`),
    repo.get(`communityConsents/${uid}`),
    repo.get(`accountDeletion/${uid}`),
    repo.get(`accountSuspensions/${uid}`),
  ]);
  return (
    approval?.data.state === "approved" &&
    consent?.data.version === COMMUNITY_TERMS_VERSION &&
    !deleted &&
    !suspended
  );
}
async function moderator(repo: AccountsRepository, actor: string) {
  const role = await repo.get(`roles/${actor}`);
  if (!role || !hasPermission(role.data, "community.moderate"))
    throw new MemberError(403, "Necesitas el permiso Moderar Comunidad.");
}
function publicFields(d: Document) {
  const {
    uid,
    alias,
    visible,
    shareAnniversary,
    shareProgress,
    marriageDate,
    timezone,
    completedCount,
    finishedCount,
    avatar,
    people,
    moderationStatus,
  } = d.data;
  return {
    uid,
    alias,
    visible,
    shareAnniversary,
    shareProgress,
    marriageDate,
    timezone,
    completedCount,
    finishedCount,
    avatar,
    people: people ?? [],
    moderationStatus,
  };
}
export async function listSafeCommunity(
  repo: AccountsRepository,
  actor: string,
  cursor: string | null,
) {
  if (cursor && !uidValid(cursor))
    throw new MemberError(400, "Página inválida.");
  const page = await repo.query(
    "community",
    [
      { field: "visible", op: "EQUAL", value: true },
      { field: "moderationStatus", op: "EQUAL", value: "approved" },
      ...(cursor ? [{ field: "uid", op: "GREATER_THAN", value: cursor }] : []),
    ],
    8,
    undefined,
    "uid",
  );
  const filtered = await Promise.all(
    page.map(async (profile) => {
      const target = String(profile.data.uid);
      if (!uidValid(target) || !(await eligibleCommunityMember(repo, target)))
        return null;
      if (
        target !== actor &&
        relationBlocked(await communityRelation(repo, actor, target))
      )
        return null;
      return publicFields(profile);
    }),
  );
  return {
    profiles: filtered.filter(Boolean),
    cursor: page.length === 8 ? String(page.at(-1)!.data.uid) : null,
  };
}
export async function setCommunityBlock(
  repo: AccountsRepository,
  actor: string,
  target: unknown,
  blocked: unknown,
  now: Date,
) {
  if (!uidValid(target) || target === actor || typeof blocked !== "boolean")
    throw new MemberError(400, "Elige otra familia.");
  const relation = await communityRelation(repo, actor, target);
  const blockedBy = new Set(
    Array.isArray(relation.data.blockedBy)
      ? (relation.data.blockedBy as string[])
      : [],
  );
  if (blocked) blockedBy.add(actor);
  else blockedBy.delete(actor);
  const [profile, mirror] = await Promise.all([
    repo.get(`community/${target}`),
    repo.get(`families/${actor}/communityBlocks/${target}`),
  ]);
  const label =
    profile?.data.visible && profile.data.moderationStatus === "approved"
      ? String(profile.data.alias)
      : String(mirror?.data.label ?? "Familia bloqueada");
  if (
    !(await repo.commit([
      {
        ...relation,
        data: {
          ...relation.data,
          blockedBy: [...blockedBy].sort(),
          updatedAt: now,
        },
      },
      {
        path: `families/${actor}/communityBlocks/${target}`,
        version: mirror?.version ?? null,
        data: { uid: target, blocked, label, updatedAt: now },
      },
    ]))
  )
    throw new MemberError(409, "El bloqueo cambió; vuelve a intentarlo.");
  return { ok: true, blocked };
}
export async function reportCommunityContent(
  repo: AccountsRepository,
  actor: string,
  input: Record<string, unknown>,
  now: Date,
) {
  if (
    typeof input.reason !== "string" ||
    !Object.hasOwn(reportReasons, input.reason)
  )
    throw new MemberError(400, "Selecciona el motivo del reporte.");
  const detail = typeof input.detail === "string" ? input.detail.trim() : "";
  if (detail.length > 600)
    throw new MemberError(400, "El detalle admite hasta 600 caracteres.");
  const targetType = input.targetType;
  const targetId = input.targetId;
  if (
    typeof targetId !== "string" ||
    !["profile", "greeting"].includes(String(targetType)) ||
    (targetType === "profile"
      ? !uidValid(targetId)
      : !/^[a-f0-9]{64}$/.test(targetId))
  )
    throw new MemberError(400, "Contenido inválido.");
  const target = await repo.get(
    `${targetType === "profile" ? "community" : "anniversaryMessages"}/${targetId}`,
  );
  if (!target)
    throw new MemberError(404, "Este contenido ya no está disponible.");
  if (
    targetType === "profile" &&
    (!target.data.visible || target.data.moderationStatus !== "approved")
  )
    throw new MemberError(404, "El perfil ya no está publicado.");
  if (
    targetType === "greeting" &&
    target.data.recipientUid !== actor &&
    target.data.senderUid !== actor
  )
    throw new MemberError(403, "Solo puedes reportar mensajes de tu familia.");
  const targetUid =
    targetType === "profile" ? targetId : String(target.data.senderUid);
  if (targetUid === actor)
    throw new MemberError(400, "No puedes reportar tu propio contenido.");
  const id = await safetyId([
    actor,
    String(targetType),
    targetId,
    now.toISOString().slice(0, 10),
  ]);
  if (await repo.get(`communityReports/${id}`))
    return { ok: true, alreadyReported: true };
  const snapshot =
    targetType === "profile"
      ? {
          alias: target.data.alias,
          avatar: target.data.avatar,
          people: target.data.people ?? [],
        }
      : {
          senderAlias: target.data.senderAlias,
          body: target.data.body,
          anniversaryDate: target.data.anniversaryDate,
        };
  if (
    !(await repo.commit([
      {
        path: `communityReports/${id}`,
        version: null,
        data: {
          reporterUid: actor,
          targetUid,
          targetType,
          targetId,
          reason: input.reason,
          detail,
          snapshot,
          targetVersion: target.version,
          state: "open",
          createdAt: now,
          updatedAt: now,
        },
      },
    ]))
  )
    return { ok: true, alreadyReported: true };
  return { ok: true, alreadyReported: false };
}
export async function moderateCommunityProfile(
  repo: AccountsRepository,
  actor: string,
  input: Record<string, unknown>,
  now: Date,
) {
  await moderator(repo, actor);
  if (
    !uidValid(input.uid) ||
    !["approve", "remove", "suspend", "reinstate"].includes(
      String(input.action),
    )
  )
    throw new MemberError(400, "Acción de moderación inválida.");
  const uid = input.uid;
  const [profile, approval, consent, account, deleted, suspended] =
    await Promise.all([
      repo.get(`community/${uid}`),
      repo.get(`communityApprovals/${uid}`),
      repo.get(`communityConsents/${uid}`),
      repo.accountInfo(uid),
      repo.get(`accountDeletion/${uid}`),
      repo.get(`accountSuspensions/${uid}`),
    ]);
  if (!profile || deleted || suspended || !account || account.disabled)
    throw new MemberError(409, "La familia no está disponible.");
  if (input.version !== profile.version)
    throw new MemberError(
      409,
      "El perfil cambió desde la vista previa. Actualiza antes de decidir.",
    );
  const reason = typeof input.note === "string" ? input.note.trim() : "";
  if (reason.length > 600)
    throw new MemberError(400, "La explicación admite hasta 600 caracteres.");
  const approving = input.action === "approve";
  if (approving) {
    if (approval?.data.state === "suspended")
      throw new MemberError(
        409,
        "Primero levanta la suspensión. Después revisa de nuevo el perfil.",
      );
    if (
      !profile.data.visible ||
      consent?.data.version !== COMMUNITY_TERMS_VERSION ||
      !account.verified
    )
      throw new MemberError(
        409,
        "Para publicar, la familia debe participar, aceptar las normas y verificar su correo.",
      );
    const content = [
      profile.data.alias,
      ...((profile.data.people ?? []) as { name: string }[]).map((p) => p.name),
    ];
    if (
      !content.every(
        (text) => typeof text === "string" && acceptableCommunityText(text),
      )
    )
      throw new MemberError(
        400,
        "El perfil contiene texto no permitido. La familia debe corregirlo.",
      );
  } else if (!reason && input.action !== "reinstate")
    throw new MemberError(400, "Explica a la familia el motivo de la medida.");
  const state = approving
    ? "approved"
    : input.action === "suspend"
      ? "suspended"
      : input.action === "reinstate"
        ? "pending"
        : "removed";
  const profileData = {
    ...profile.data,
    moderationStatus: approving
      ? "approved"
      : input.action === "reinstate"
        ? "pending"
        : "removed",
    updatedAt: now,
  };
  const writes: Write[] = [
    { path: profile.path, version: profile.version, data: profileData },
    {
      path: `communityApprovals/${uid}`,
      version: approval?.version ?? null,
      data: {
        state,
        note: reason,
        reviewedBy: actor,
        reviewedAt: now,
        ...(approving
          ? {
              alias: profile.data.alias,
              avatar: profile.data.avatar,
              people: profile.data.people ?? [],
            }
          : {}),
      },
    },
    {
      path: `adminAudit/${crypto.randomUUID()}`,
      version: null,
      data: {
        actorUid: actor,
        action: `community.${input.action}`,
        target: uid,
        at: now,
      },
    },
  ];
  if (!(await repo.commit(writes)))
    throw new MemberError(409, "El perfil cambió; actualiza la revisión.");
  return { ok: true };
}
export async function resolveCommunityReport(
  repo: AccountsRepository,
  actor: string,
  input: Record<string, unknown>,
  now: Date,
) {
  await moderator(repo, actor);
  if (
    typeof input.id !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.id) ||
    !["dismiss", "remove"].includes(String(input.action))
  )
    throw new MemberError(400, "Reporte inválido.");
  const report = await repo.get(`communityReports/${input.id}`);
  if (!report) throw new MemberError(404, "Reporte no disponible.");
  if (report.data.state === "resolved") return { ok: true };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (!note || note.length > 600)
    throw new MemberError(
      400,
      "Indica el resultado de la revisión (hasta 600 caracteres).",
    );
  const writes: Write[] = [];
  if (input.action === "remove" && report.data.targetType === "profile") {
    const current = await repo.get(`community/${report.data.targetUid}`);
    if (current)
      await moderateCommunityProfile(
        repo,
        actor,
        {
          uid: report.data.targetUid,
          version: input.profileVersion ?? report.data.targetVersion,
          action: "remove",
          note,
        },
        now,
      );
  } else if (input.action === "remove") {
    const message = await repo.get(
      `anniversaryMessages/${report.data.targetId}`,
    );
    if (message) {
      writes.push({
        path: message.path,
        version: message.version,
        data: {
          ...message.data,
          body: "Mensaje retirado por moderación.",
          moderationRemoved: true,
        },
      });
      const inbox = await repo.get(
        `families/${message.data.recipientUid}/inbox/anniversary-${report.data.targetId}`,
      );
      if (inbox)
        writes.push({
          path: inbox.path,
          version: inbox.version,
          data: {
            ...inbox.data,
            title: "Felicitación retirada",
            body: "Este mensaje fue retirado por moderación.",
            moderationRemoved: true,
          },
        });
    }
  }
  writes.push(
    {
      path: report.path,
      version: report.version,
      data: {
        ...report.data,
        state: "resolved",
        snapshot: null,
        resolution: input.action,
        resolutionNote: note,
        reviewedBy: actor,
        updatedAt: now,
      },
    },
    {
      path: `adminAudit/${crypto.randomUUID()}`,
      version: null,
      data: {
        actorUid: actor,
        action: `community.report.${input.action}`,
        target: input.id,
        at: now,
      },
    },
  );
  if (!(await repo.commit(writes)))
    throw new MemberError(409, "El reporte cambió; actualiza la lista.");
  return { ok: true };
}
export async function moderationRequest(
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
    const path = new URL(request.url).pathname;
    const isAdmin = path.startsWith("/community/moderation");
    const actor = await requireMember(request, env, repo, now, verify, isAdmin);
    if (isAdmin) await moderator(repo, actor.uid);
    if (request.method === "GET" && path === "/community/profiles")
      return json(
        await listSafeCommunity(
          repo,
          actor.uid,
          new URL(request.url).searchParams.get("cursor"),
        ),
      );
    if (request.method === "GET" && path === "/community/moderation") {
      const cursor = new URL(request.url).searchParams.get("cursor");
      if (cursor && !uidValid(cursor))
        throw new MemberError(400, "Página inválida.");
      const [profiles, reports] = await Promise.all([
        repo.query(
          "community",
          cursor ? [{ field: "uid", op: "GREATER_THAN", value: cursor }] : [],
          20,
          undefined,
          "uid",
        ),
        repo.query(
          "communityReports",
          [{ field: "state", op: "EQUAL", value: "open" }],
          20,
        ),
      ]);
      const rows = await Promise.all(
        profiles
          .filter(
            (p) => p.data.visible || p.data.moderationStatus === "removed",
          )
          .map(async (p) => {
            const approval = await repo.get(`communityApprovals/${p.data.uid}`);
            return {
              ...publicFields(p),
              version: p.version,
              review: approval?.data ?? null,
            };
          }),
      );
      return json({
        profiles: rows,
        reports: reports.map((r) => ({
          id: r.path.split("/").at(-1),
          ...r.data,
        })),
        cursor:
          profiles.length === 20 ? String(profiles.at(-1)!.data.uid) : null,
      });
    }
    if (request.method !== "POST")
      throw new MemberError(405, "Acción no permitida.");
    const raw = await request.text();
    if (raw.length > 4096)
      throw new MemberError(400, "Solicitud demasiado grande.");
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new MemberError(400, "Solicitud inválida.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new MemberError(400, "Solicitud inválida.");
    if (path === "/community/block")
      return json(
        await setCommunityBlock(repo, actor.uid, input.uid, input.blocked, now),
      );
    if (path === "/community/report")
      return json(await reportCommunityContent(repo, actor.uid, input, now));
    if (path === "/community/moderation/profile")
      return json(await moderateCommunityProfile(repo, actor.uid, input, now));
    if (path === "/community/moderation/report")
      return json(await resolveCommunityReport(repo, actor.uid, input, now));
    throw new MemberError(404, "Acción no encontrada.");
  } catch (e) {
    return json(
      {
        error:
          e instanceof MemberError
            ? e.message
            : "No se pudo completar la acción de Comunidad. Inténtalo otra vez.",
      },
      e instanceof MemberError ? e.status : 503,
    );
  }
}
