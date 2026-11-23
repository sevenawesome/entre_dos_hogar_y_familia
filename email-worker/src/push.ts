import type { AccountsRepository } from "./accounts-google";
import { accountsHeaders } from "./account-admin";
import type { Data, Document, Env, Write } from "./google";
import { MemberError, requireMember } from "./member-auth";
import { verifyFirebaseToken } from "./firebase-token";

const tokenPattern =
  /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/;
const expiry = 30 * 86400000;
const date = (v: unknown) =>
  v instanceof Date ? v.getTime() : Date.parse(String(v));
async function tokenPath(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return `pushTokens/${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
export async function pushDeviceRequest(
  request: Request,
  env: Env,
  repo: AccountsRepository,
  now = new Date(),
  verify = verifyFirebaseToken,
) {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: accountsHeaders });
  try {
    if (request.method !== "POST") throw new MemberError(405, "Usa POST.");
    const { uid } = await requireMember(request, env, repo, now, verify, false);
    const input = (await request.json()) as Data;
    if (
      typeof input.token !== "string" ||
      !tokenPattern.test(input.token) ||
      typeof input.enabled !== "boolean" ||
      !["ios", "android"].includes(String(input.platform)) ||
      typeof input.deviceId !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(input.deviceId)
    )
      throw new MemberError(400, "No pudimos registrar este teléfono.");
    const path = await tokenPath(input.token),
      old = await repo.get(path);
    // A token has one current account. Signing out an old session cannot revoke its new owner.
    if (!input.enabled && old?.data.uid !== uid)
      return Response.json({ enabled: false }, { headers: accountsHeaders });
    const saved = await repo.commit([
      {
        path,
        version: old?.version ?? null,
        data: {
          uid,
          platform: input.platform,
          deviceId: input.deviceId,
          token: input.token,
          enabled: input.enabled,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + expiry),
        },
      },
    ]);
    if (!saved)
      throw new MemberError(
        409,
        "Vuelve a activar los avisos en este teléfono.",
      );
    return Response.json(
      {
        enabled:
          input.enabled &&
          env.PUSH_ENABLED === "true" &&
          (input.platform === "ios" || env.PUSH_ANDROID_ENABLED === "true"),
      },
      { headers: accountsHeaders },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof MemberError
            ? error.message
            : "No pudimos registrar los avisos. Vuelve a intentarlo.",
      },
      {
        status: error instanceof MemberError ? error.status : 503,
        headers: accountsHeaders,
      },
    );
  }
}
const fields = [
  "pushState",
  "pushAttemptedAt",
  "pushTickets",
  "pushDevices",
  "createdAt",
  "senderUid",
  "kind",
  "moderationRemoved",
];
const messageFields = [...fields, "title", "body"];
function notificationPayload(message: Document, token: unknown, uid: string) {
  const payload = {
    to: token,
    title: String(message.data.title),
    body: String(message.data.body),
    sound: "default",
    channelId: "retos",
    ttl: 3600,
    data: {
      screen: "inbox",
      accountUid: uid,
      messageId: message.path.split("/").at(-1),
    },
  };
  // APNs limits the complete UTF-8 JSON payload, not the number of characters.
  // Keep the full message in the inbox and shorten only oversized push previews.
  const encoder = new TextEncoder();
  if (encoder.encode(JSON.stringify(payload)).length > 3800) {
    const points = Array.from(payload.body);
    let low = 0,
      high = points.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      payload.body = points.slice(0, middle).join("") + "…";
      if (encoder.encode(JSON.stringify(payload)).length <= 3800) low = middle;
      else high = middle - 1;
    }
    payload.body = points.slice(0, low).join("") + "…";
  }
  return payload;
}
async function patch(repo: AccountsRepository, message: Document, data: Data) {
  return repo.commit([
    {
      path: message.path,
      version: message.version,
      data,
      mask: Object.keys(data),
    },
  ]);
}
async function receiptCycle(
  repo: AccountsRepository,
  fetcher: typeof fetch,
  now: Date,
) {
  const rows = await repo.query(
    "inbox",
    [{ field: "pushState", op: "EQUAL", value: "accepted" }],
    2,
    fields,
    undefined,
    true,
  );
  for (const message of rows) {
    const tickets = message.data.pushTickets as
      { id: string; path: string; deviceId: string }[] | undefined;
    const age = now.getTime() - date(message.data.pushAttemptedAt);
    if (!tickets?.length || age > 3600000) {
      await patch(repo, message, { pushState: "failed" });
      continue;
    }
    if (age < 20000) continue;
    const response = await fetcher(
      "https://exp.host/--/api/v2/push/getReceipts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: tickets.map((t) => t.id) }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) continue;
    const result = (await response.json()) as {
      data?: Record<string, { status: string; details?: { error?: string } }>;
    };
    if (!tickets.every((t) => result.data?.[t.id])) continue;
    const invalid: Write[] = [];
    for (const ticket of tickets)
      if (result.data?.[ticket.id]?.details?.error === "DeviceNotRegistered") {
        const device = await repo.get(ticket.path);
        if (device?.data.uid === message.path.split("/")[1])
          invalid.push({
            path: device.path,
            version: device.version,
            data: { enabled: false },
            mask: ["enabled"],
          });
      }
    if (invalid.length) await repo.commit(invalid);
    const delivered = tickets.filter(
      (t) => result.data?.[t.id]?.status === "ok",
    );
    await patch(repo, message, {
      pushState: delivered.length ? "sent" : "failed",
      pushDevices: delivered.map((t) => t.deviceId),
      pushError: delivered.length
        ? null
        : String(
            result.data?.[tickets[0].id]?.details?.error ?? "ProviderError",
          ).slice(0, 80),
      pushTickets: [],
    });
  }
}
/** Bounded separately from mail/cleanup to fit Workers Free. Attachments stay in the inbox. */
export async function pushCycle(
  repo: AccountsRepository,
  env: Env,
  fetcher = fetch,
  now = new Date(),
) {
  if (env.PUSH_ENABLED !== "true") return;
  await receiptCycle(repo, fetcher, now);
  const settings = await repo.get("config/app", ["notificationsEnabled"]);
  const rows = await repo.query(
    "inbox",
    [{ field: "pushState", op: "EQUAL", value: "pending" }],
    2,
    messageFields,
    undefined,
    true,
  );
  for (const message of rows) {
    const uid = message.path.split("/")[1],
      sender = String(message.data.senderUid ?? "");
    const age = now.getTime() - date(message.data.createdAt);
    if (
      message.path.split("/").length !== 4 ||
      !sender ||
      typeof message.data.title !== "string" ||
      typeof message.data.body !== "string" ||
      message.data.kind === "anniversaryGreeting" ||
      message.data.moderationRemoved ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > 86400000 ||
      settings?.data.notificationsEnabled === false
    ) {
      await patch(repo, message, { pushState: "skipped" });
      continue;
    }
    const [
      account,
      deleted,
      suspended,
      controls,
      family,
      senderDeleted,
      senderSuspended,
    ] = await Promise.all([
      repo.accountInfo(uid),
      repo.get(`accountDeletion/${uid}`, ["requestedAt"]),
      repo.get(`accountSuspensions/${uid}`, ["state"]),
      repo.get(`familyControls/${uid}`, ["remindersPaused"]),
      repo.get(`families/${uid}`, ["name"]),
      repo.get(`accountDeletion/${sender}`, ["requestedAt"]),
      repo.get(`accountSuspensions/${sender}`, ["state"]),
    ]);
    if (
      !account ||
      account.disabled ||
      deleted ||
      suspended ||
      controls?.data.remindersPaused ||
      !family ||
      senderDeleted ||
      senderSuspended
    ) {
      await patch(repo, message, { pushState: "skipped" });
      continue;
    }
    const devices = (
      await repo.query(
        "pushTokens",
        [
          { field: "uid", op: "EQUAL", value: uid },
          { field: "enabled", op: "EQUAL", value: true },
        ],
        5,
      )
    ).filter(
      (d) =>
        d.data.enabled === true &&
        (d.data.platform === "ios" ||
          (d.data.platform === "android" &&
            env.PUSH_ANDROID_ENABLED === "true")) &&
        date(d.data.expiresAt) > now.getTime() &&
        typeof d.data.token === "string" &&
        tokenPattern.test(d.data.token),
    );
    if (!devices.length) {
      await patch(repo, message, { pushState: "skipped" });
      continue;
    }
    if (
      !(await patch(repo, message, {
        pushState: "sending",
        pushAttemptedAt: now,
        pushDevices: devices.map((d) => d.data.deviceId),
      }))
    )
      continue;
    const claimed = await repo.get(message.path, messageFields);
    if (!claimed) continue;
    try {
      const response = await fetcher("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify(
          devices.map((d) => notificationPayload(claimed, d.data.token, uid)),
        ),
      });
      const result = (await response.json()) as {
        data?: { status: string; id?: string; details?: { error?: string } }[];
      };
      const tickets =
        response.ok && Array.isArray(result.data)
          ? result.data.flatMap((t, i) =>
              t.status === "ok" && t.id && devices[i]
                ? [
                    {
                      id: t.id,
                      path: devices[i].path,
                      deviceId: String(devices[i].data.deviceId),
                    },
                  ]
                : [],
            )
          : [];
      const invalid: Write[] = [];
      for (let i = 0; i < (result.data?.length ?? 0); i++)
        if (
          result.data?.[i].details?.error === "DeviceNotRegistered" &&
          devices[i]
        )
          invalid.push({
            path: devices[i].path,
            version: devices[i].version,
            data: { enabled: false },
            mask: ["enabled"],
          });
      if (invalid.length) await repo.commit(invalid);
      await patch(repo, claimed, {
        pushState: tickets.length ? "accepted" : "failed",
        pushTickets: tickets,
        pushDevices: tickets.map((t) => t.deviceId),
        pushError: tickets.length
          ? null
          : String(result.data?.[0]?.details?.error ?? "ProviderError").slice(
              0,
              80,
            ),
      });
    } catch {
      // Delivery may have been accepted before a network timeout. Never retry blindly.
      await patch(repo, claimed, {
        pushState: "failed",
        pushTickets: [],
        pushError: "NetworkError",
      });
    }
  }
  const abandoned = await repo.query(
    "inbox",
    [{ field: "pushState", op: "EQUAL", value: "sending" }],
    2,
    fields,
    undefined,
    true,
  );
  for (const message of abandoned)
    if (now.getTime() - date(message.data.pushAttemptedAt) > 600000)
      await patch(repo, message, { pushState: "failed" });
}
