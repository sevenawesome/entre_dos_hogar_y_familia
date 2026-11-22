import { getAnniversary } from "../../src/domain/anniversary";
import type { AccountsRepository } from "./accounts-google";
import { accountsHeaders } from "./account-admin";
import type { Env } from "./google";
import { MemberError, requireMember } from "./member-auth";
import { verifyFirebaseToken } from "./firebase-token";
import {
  COMMUNITY_TERMS_VERSION,
  acceptableCommunityText,
} from "../../src/domain/community-safety";
import { communityRelation, relationBlocked } from "./moderation";
const uid = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
export async function greetingId(
  sender: string,
  recipient: string,
  date: string,
) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify([sender, recipient, date])),
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function sendAnniversaryGreeting(
  repo: AccountsRepository,
  sender: string,
  input: Record<string, unknown>,
  now = new Date(),
) {
  if (!uid(sender) || !uid(input.recipientUid) || sender === input.recipientUid)
    throw new MemberError(400, "Elige otra familia de la comunidad.");
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body || body.length > 1000)
    throw new MemberError(
      400,
      "Escribe una felicitación de hasta 1000 caracteres.",
    );
  const recipient = input.recipientUid;
  if (!acceptableCommunityText(body))
    throw new MemberError(
      400,
      "La felicitación contiene texto o enlaces no permitidos. Escríbanla con respeto y sin publicidad.",
    );
  const [relation, fromApproval, toApproval, consent] = await Promise.all([
    communityRelation(repo, sender, recipient),
    repo.get(`communityApprovals/${sender}`),
    repo.get(`communityApprovals/${recipient}`),
    repo.get(`communityConsents/${sender}`),
  ]);
  if (relationBlocked(relation))
    throw new MemberError(
      403,
      "No se pueden enviar felicitaciones entre estas familias.",
    );
  if (
    fromApproval?.data.state !== "approved" ||
    toApproval?.data.state !== "approved" ||
    consent?.data.version !== COMMUNITY_TERMS_VERSION
  )
    throw new MemberError(
      403,
      "Ambas familias deben tener un perfil aprobado y aceptar las normas de Comunidad.",
    );
  const [
    from,
    to,
    deleted,
    sourceFamily,
    targetFamily,
    senderDeleted,
    senderSuspended,
  ] = await Promise.all([
    repo.get(`community/${sender}`),
    repo.get(`community/${recipient}`),
    repo.get(`accountDeletion/${recipient}`, ["requestedAt"]),
    repo.get(`families/${sender}`, ["name"]),
    repo.get(`families/${recipient}`, ["name"]),
    repo.get(`accountDeletion/${sender}`, ["requestedAt"]),
    repo.get(`accountSuspensions/${sender}`, ["state"]),
  ]);
  if (
    !from?.data.visible ||
    from.data.moderationStatus !== "approved" ||
    typeof from.data.alias !== "string" ||
    !sourceFamily ||
    senderDeleted ||
    senderSuspended
  )
    throw new MemberError(
      403,
      "Activa tu participación en Comunidad para felicitar como familia.",
    );
  if (
    !to?.data.visible ||
    to.data.moderationStatus !== "approved" ||
    !to.data.shareAnniversary ||
    deleted ||
    !!(await repo.get(`accountSuspensions/${recipient}`)) ||
    !targetFamily
  )
    throw new MemberError(
      403,
      "Esta familia no comparte su aniversario en Comunidad.",
    );
  const event = getAnniversary(
    to.data.marriageDate as string,
    to.data.timezone as string,
    now,
  );
  if (!event?.isToday || event.years < 1)
    throw new MemberError(
      409,
      "Las felicitaciones se envían el día del aniversario de esa familia.",
    );
  const id = await greetingId(sender, recipient, event.nextDate),
    path = `anniversaryMessages/${id}`;
  const previous = await repo.get(path, ["recipientUid"]);
  if (previous) return { ok: true, alreadySent: true };
  const data = {
    recipientUid: recipient,
    senderUid: sender,
    senderAlias: from.data.alias,
    anniversaryDate: event.nextDate,
    years: event.years,
    body,
    createdAt: now,
  };
  const saved = await repo.commit([
    relation,
    { path: from.path, version: from.version, data: from.data },
    { path: to.path, version: to.version, data: to.data },
    {
      path: fromApproval.path,
      version: fromApproval.version,
      data: fromApproval.data,
    },
    {
      path: toApproval.path,
      version: toApproval.version,
      data: toApproval.data,
    },
    { path, version: null, data },
    {
      path: `families/${recipient}/inbox/anniversary-${id}`,
      version: null,
      data: {
        senderUid: sender,
        title: "¡Una felicitación por su aniversario! ♡",
        body: `${from.data.alias}: ${body}`,
        createdAt: now,
        kind: "anniversaryGreeting",
        anniversaryDate: event.nextDate,
      },
    },
  ]);
  if (!saved) {
    if (await repo.get(path, ["recipientUid"]))
      return { ok: true, alreadySent: true };
    throw new MemberError(409, "Vuelve a intentarlo en un momento.");
  }
  return { ok: true, alreadySent: false };
}
export async function communityRequest(
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
    const actor = await requireMember(request, env, repo, now, verify);
    const raw = await request.text();
    if (raw.length > 4096)
      throw new MemberError(400, "Mensaje demasiado largo.");
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new MemberError(400, "Mensaje inválido.");
    }
    if (!input || typeof input !== "object")
      throw new MemberError(400, "Mensaje inválido.");
    return json(await sendAnniversaryGreeting(repo, actor.uid, input, now));
  } catch (e) {
    return json(
      {
        error:
          e instanceof MemberError
            ? e.message
            : "No pudimos guardar la felicitación. Inténtalo otra vez.",
      },
      e instanceof MemberError ? e.status : 503,
    );
  }
}
