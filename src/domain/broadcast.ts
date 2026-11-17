import { validateAttachments, type MessageAttachment } from "./attachments";
export type DeliveryChannel = "email" | "notification";
export interface BroadcastRecipient {
  uid: string;
  name: string;
  email: string;
}
export interface BroadcastDraft {
  id: string;
  actor: string;
  channel: DeliveryChannel;
  title: string;
  body: string;
  attachments: MessageAttachment[];
  recipients: BroadcastRecipient[];
  completed: string[];
  failures: Record<string, string>;
  createdAt: string;
}
export function parseBroadcastDraft(
  raw: string,
  actor: string,
  channel: DeliveryChannel,
): BroadcastDraft {
  const value = JSON.parse(raw) as BroadcastDraft;
  if (
    !value ||
    value.actor !== actor ||
    value.channel !== channel ||
    !Array.isArray(value.recipients) ||
    !Array.isArray(value.completed) ||
    !value.failures ||
    typeof value.failures !== "object" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    value.recipients.some(
      (r) =>
        !r ||
        typeof r.uid !== "string" ||
        typeof r.name !== "string" ||
        typeof r.email !== "string",
    ) ||
    value.completed.some((uid) => !value.recipients.some((r) => r.uid === uid))
  )
    throw Error("No se pudo recuperar el borrador colectivo.");
  deliveryCommit({
    ...value,
    uid: value.recipients[0]?.uid ?? actor,
    operationId: value.id,
    projectId: "demo-check",
  });
  return value;
}
export async function prepareBroadcastRecipients<
  T extends {
    uid: string;
    email: string;
    family: { name: string };
    summary: { emailVerified?: boolean } | null;
  },
>(
  rows: T[],
  channel: DeliveryChannel,
  status: (uid: string) => Promise<{ enabled: boolean; unsubscribed: boolean }>,
) {
  const recipients: BroadcastRecipient[] = [];
  let excluded = 0;
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.uid)) continue;
    seen.add(row.uid);
    if (channel === "email") {
      if (!row.summary?.emailVerified || !row.email.trim()) {
        excluded++;
        continue;
      }
      const pref = await status(row.uid);
      if (!pref.enabled || pref.unsubscribed) {
        excluded++;
        continue;
      }
    }
    recipients.push({ uid: row.uid, name: row.family.name, email: row.email });
  }
  return { recipients, excluded };
}

/** One immutable document per campaign/family; retries never overwrite a delivery. */
export function deliveryCommit(input: {
  projectId: string;
  actor: string;
  uid: string;
  operationId: string;
  channel: DeliveryChannel;
  title: string;
  body: string;
  attachments?: MessageAttachment[];
}) {
  const { projectId, actor, uid, operationId, channel } = input;
  if (
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[A-Za-z0-9]{20}$/.test(operationId) ||
    [actor, uid].some(
      (id) => !id || id.length > 128 || /[\/\x00-\x1f]/.test(id),
    ) ||
    !["email", "notification"].includes(channel)
  )
    throw Error("Envío colectivo inválido.");
  if (
    !input.title.trim() ||
    input.title.length > 100 ||
    !input.body.trim() ||
    input.body.length > 1200
  )
    throw Error("Revisa el título y el mensaje antes de enviar.");
  const attachments = validateAttachments(input.attachments);
  const root = `projects/${projectId}/databases/(default)/documents`;
  const id = `broadcast-${channel}-${actor}-${operationId}-${uid}`;
  const auditId = `${id}-audit`;
  const target =
    channel === "email" ? `emailQueue/${id}` : `families/${uid}/inbox/${id}`;
  const str = (value: string) => ({ stringValue: value });
  const fields: Record<string, unknown> = {
    title: str(input.title.trim()),
    body: str(input.body.trim()),
    senderUid: str(actor),
    auditId: str(auditId),
    ...(channel === "email" ? { uid: str(uid), state: str("pending") } : {}),
    ...(attachments.length
      ? {
          attachments: {
            arrayValue: {
              values: attachments.map((a) => ({
                mapValue: {
                  fields: {
                    name: str(a.name),
                    mime: str(a.mime),
                    base64: str(a.base64),
                    size: { integerValue: String(a.size) },
                  },
                },
              })),
            },
          },
        }
      : {}),
  };
  return {
    writes: [
      {
        update: { name: `${root}/${target}`, fields },
        currentDocument: { exists: false },
        updateTransforms: [
          { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
        ],
      },
      {
        update: {
          name: `${root}/adminAudit/${auditId}`,
          fields: {
            actorUid: str(actor),
            action: str(channel === "email" ? "email.send" : "message.send"),
            target: str(uid),
          },
        },
        currentDocument: { exists: false },
        updateTransforms: [
          { fieldPath: "at", setToServerValue: "REQUEST_TIME" },
        ],
      },
    ],
  };
}
export async function commitDeliveryOnce(
  input: Parameters<typeof deliveryCommit>[0],
  token: string,
  fetcher = fetch,
) {
  const payload = deliveryCommit(input);
  const response = await fetcher(
    `https://firestore.googleapis.com/v1/projects/${input.projectId}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (response.ok) return "created" as const;
  const result = await response.json().catch(() => ({}));
  if (response.status === 409 && result.error?.status === "ALREADY_EXISTS")
    return "existing" as const;
  throw Error(
    response.status === 403
      ? "No tienes permiso o esta familia ya no puede recibir este envío."
      : "No se pudo preparar este destinatario. Puedes reintentar sin duplicarlo.",
  );
}
export async function runBroadcast(
  initial: BroadcastDraft,
  deliver: (recipient: BroadcastRecipient) => Promise<unknown>,
  save: (state: BroadcastDraft) => Promise<void>,
  stopped: () => boolean = () => false,
) {
  let state: BroadcastDraft = {
    ...initial,
    completed: [...initial.completed],
    failures: { ...initial.failures },
  };
  // Persist the immutable campaign before its first external side effect.
  await save(state);
  for (const recipient of state.recipients) {
    if (stopped()) break;
    if (state.completed.includes(recipient.uid)) continue;
    try {
      await deliver(recipient);
      state = {
        ...state,
        completed: [...state.completed, recipient.uid],
        failures: { ...state.failures },
      };
      delete state.failures[recipient.uid];
    } catch (e) {
      state = {
        ...state,
        failures: {
          ...state.failures,
          [recipient.uid]:
            e instanceof Error
              ? e.message
              : "No se pudo preparar este destinatario.",
        },
      };
    }
    await save(state);
  }
  return state;
}
