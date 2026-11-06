import {
  defaultEmailSettings,
  migrateEmailBrand,
  validateEmailSettings,
  type EmailSettings,
} from "../../src/domain/email-settings";
import { hasPermission } from "../../src/domain/admin-permissions";
import {
  eventEmailDraft,
  type EmailDraft,
  type EmailPreferences,
} from "../../src/domain/email-reminders";

import {
  googleRepository,
  b64,
  unb64,
  type Data,
  type Document,
  type Env,
  type Repository,
} from "./google";

const DAY = 86400000,
  DAILY_LIMIT = 90,
  MONTHLY_LIMIT = 2700;
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const when = (x: unknown) =>
  x instanceof Date ? x.getTime() : typeof x === "string" ? Date.parse(x) : 0;
function ready(env: Env) {
  return (
    !!env.GOOGLE_SERVICE_ACCOUNT &&
    !!env.RESEND_API_KEY &&
    !!env.UNSUBSCRIBE_SECRET &&
    env.UNSUBSCRIBE_SECRET.length >= 32 &&
    /^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(env.PUBLIC_BASE_URL) &&
    !env.PUBLIC_BASE_URL.includes("REEMPLAZAR") &&
    /^[^\r\n]+<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$/.test(env.FROM_EMAIL) &&
    !env.FROM_EMAIL.includes("REEMPLAZAR")
  );
}
function settingsOf(data: Data | undefined) {
  return validateEmailSettings(
    migrateEmailBrand({ ...defaultEmailSettings, ...data }),
  );
}
function senderFor(env: Env, settings: EmailSettings) {
  const original = env.FROM_EMAIL.match(/<([^<>\s]+@([^<>\s@]+))>/),
    address = settings.fromEmail || original?.[1];
  if (
    !original ||
    !address ||
    address.split("@")[1]?.toLowerCase() !== original[2].toLowerCase() ||
    /[\r\n<>]/.test(settings.fromName)
  )
    return null;
  return `${settings.fromName} <${address}>`;
}
async function hmac(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function unsubscribeToken(
  uid: string,
  expires: number,
  secret: string,
) {
  const text = `v1|${uid}|${expires}`,
    key = await hmac(secret),
    sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return `${expires}.${b64(new Uint8Array(sig))}`;
}
async function validToken(
  uid: string,
  token: string,
  secret: string,
  now: Date,
) {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(uid) ||
    !/^\d{13}\.[A-Za-z0-9_-]+$/.test(token)
  )
    return false;
  const [expiry, signature] = token.split(".");
  if (
    Number(expiry) < now.getTime() ||
    Number(expiry) > now.getTime() + 91 * DAY
  )
    return false;
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await hmac(secret),
      unb64(signature).buffer as ArrayBuffer,
      new TextEncoder().encode(`v1|${uid}|${expiry}`),
    );
  } catch {
    return false;
  }
}
export async function unsubscribe(
  request: Request,
  env: Env,
  repo: Repository,
  now = new Date(),
) {
  const url = new URL(request.url),
    uid = url.searchParams.get("uid") ?? "",
    token = url.searchParams.get("token") ?? "";
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      "default-src 'none'; form-action 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'",
  };
  if (
    !env.UNSUBSCRIBE_SECRET ||
    !(await validToken(uid, token, env.UNSUBSCRIBE_SECRET, now))
  )
    return new Response(
      "Enlace inválido o vencido. Contacta al equipo de Amor que permanece para recibir ayuda.",
      { status: 400, headers },
    );
  if (request.method === "GET")
    return new Response(
      '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width"><title>Correos de Amor que permanece</title><body style="font:18px system-ui;max-width:550px;margin:60px auto;padding:24px"><h1>Sus correos, a su ritmo.</h1><p>Confirma para dejar de recibir correos de bienvenida, niveles conseguidos y administración. Los correos de acceso seguirán disponibles.</p><form method="post"><button style="padding:18px;border:0;border-radius:14px;background:#A77819;color:white;font-size:18px">Dejar de recibir correos opcionales</button></form></body></html>',
      { headers },
    );
  if (request.method !== "POST")
    return new Response("Método no permitido", { status: 405, headers });
  const pref = await repo.get(`emailPreferences/${uid}`);
  if (
    !(await repo.commit([
      {
        path: `emailPreferences/${uid}`,
        version: pref?.version ?? null,
        data: {
          ...pref?.data,
          enabled: false,
          unsubscribed: true,
          version: Number(pref?.data.version ?? 0) + 1,
          updatedAt: now,
        },
      },
    ]))
  )
    return new Response("Las preferencias cambiaron. Vuelve a confirmar.", {
      status: 409,
      headers,
    });
  return new Response(
    "<html lang=es><title>Baja confirmada</title><p>Correos opcionales desactivados. La baja se respetará también en los envíos del equipo.</p></html>",
    { headers },
  );
}
interface Payload {
  from: string;
  reply_to?: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}
export async function emailPayload(
  uid: string,
  email: string,
  draft: EmailDraft,
  env: Env,
  createdAt: Date,
  settings: EmailSettings = defaultEmailSettings,
): Promise<Payload> {
  const from = senderFor(env, settings);
  if (!from) throw new Error("Sender domain is not configured");
  const subject =
    (settings.subjectPrefix ? settings.subjectPrefix + " · " : "") +
    draft.subject;
  const token = await unsubscribeToken(
    uid,
    createdAt.getTime() + 90 * DAY,
    env.UNSUBSCRIBE_SECRET!,
  );
  const link = `${env.PUBLIC_BASE_URL}/unsubscribe?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
  const text = `Amor que permanece · By Departamento de Hogar y Familia\n\n${draft.lines.join("\n\n")}\n\nDejar de recibir correos opcionales: ${link}\nCreado por SevenAwesome · https://www.sevenawesome.com/`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#FBF7EE;color:#06264A;font:16px Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:32px"><h1 style="color:#A77819">♡ Amor que permanece</h1><p>By Departamento de Hogar y Familia</p><div style="background:white;border-radius:22px;padding:26px"><h2>${escapeHtml(draft.subject)}</h2>${draft.lines.map((line) => `<p style="line-height:1.7">${escapeHtml(line).replace(/\n/g, "<br>")}</p>`).join("")}</div><p style="font-size:13px;line-height:1.7">Reciben este correo sobre su cuenta y participación en Amor que permanece. <a href="${escapeHtml(link)}">Dejar de recibir correos opcionales</a>.</p><p style="font-size:13px">Creado por <a href="https://www.sevenawesome.com/">SevenAwesome</a></p></div></body></html>`;
  return {
    from,
    reply_to: settings.replyTo,
    to: [email],
    subject: subject.replace(/[\r\n]+/g, " "),
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${link}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
interface Job extends Data {
  uid: string;
  categories: EmailDraft["categories"];
  consentVersion: number;
  payload?: Payload;
  createdAt: Date;
  nextAttemptAt: Date;
  terminal: boolean;
  attempts: number;
  queueId?: string;
  eventId?: string;
}
async function stop(
  repo: Repository,
  job: Document<Job>,
  state: string,
  now: Date,
  providerId?: string,
) {
  const { payload: _payload, ...rest } = job.data;
  const saved = await repo.commit([
    {
      path: job.path,
      version: job.version,
      data: {
        ...rest,
        terminal: true,
        state,
        finishedAt: now,
        ...(providerId ? { providerId } : {}),
      },
    },
  ]);
  if (saved && (job.data.queueId || job.data.eventId)) {
    const q = await repo.get(
      job.data.queueId
        ? `emailQueue/${job.data.queueId}`
        : `mailEvents/${job.data.eventId}`,
    );
    if (q)
      await repo.commit([
        {
          path: q.path,
          version: q.version,
          data: {
            uid: job.data.uid,
            state,
            createdAt: q.data.createdAt,
            finishedAt: now,
          },
        },
      ]);
  }
}
async function eligible(repo: Repository, job: Job, _now: Date) {
  const prefs = await repo.get<EmailPreferences>(`emailPreferences/${job.uid}`);
  if (
    prefs?.data.enabled === false ||
    prefs?.data.unsubscribed ||
    (prefs?.data.version ?? 0) !== job.consentVersion ||
    !job.categories.length ||
    job.categories.some(
      (c) => !["welcome", "levelCompleted", "adminMessages"].includes(c),
    )
  )
    return false;
  if (await repo.get(`accountDeletion/${job.uid}`)) return false;
  const account = await repo.account(job.uid);
  return (
    !!account?.verified &&
    !account.disabled &&
    !!account.email &&
    account.email === job.payload?.to[0]
  );
}
export async function deliverJob(
  repo: Repository,
  job: Document<Job>,
  env: Env,
  now: Date,
  fetcher = fetch,
) {
  if (job.data.terminal || when(job.data.nextAttemptAt) > now.getTime()) return;
  if (
    !job.data.payload ||
    now.getTime() - when(job.data.createdAt) >= 23 * 3600000
  ) {
    await stop(repo, job, "review_required", now);
    return;
  }
  const config = await repo.get("config/email");
  if (
    !config?.data.enabled ||
    config.data.paused ||
    env.SEND_ENABLED !== "true"
  )
    return;
  if (
    (job.data.categories.includes("adminMessages") &&
      config.data.adminMessagesEnabled === false) ||
    (job.data.categories.includes("welcome") &&
      config.data.welcomeEnabled === false) ||
    (job.data.categories.includes("levelCompleted") &&
      config.data.completionEnabled === false)
  ) {
    await stop(repo, job, "suppressed", now);
    return;
  }
  if (!(await eligible(repo, job.data, now))) {
    await stop(repo, job, "suppressed", now);
    return;
  }
  if (job.data.queueId) {
    const q = await repo.get(`emailQueue/${job.data.queueId}`),
      sender = q?.data.senderUid as string | undefined,
      role = sender ? await repo.get(`roles/${sender}`) : null;
    if (
      !hasPermission(role?.data ?? {}, "emails.send") ||
      !!(sender && (await repo.get(`accountDeletion/${sender}`)))
    ) {
      await stop(repo, job, "suppressed", now);
      return;
    }
  }
  const claim = {
    ...job.data,
    attempts: job.data.attempts + 1,
    nextAttemptAt: new Date(now.getTime() + 15 * 60000),
  };
  if (
    !(await repo.commit([
      { path: job.path, version: job.version, data: claim },
    ]))
  )
    return;
  const leased = await repo.get<Job>(job.path);
  if (!leased) return;
  // A second consent read closes the lease gap; the sender never trusts a queued email address.
  if (!(await eligible(repo, leased.data, now))) {
    await stop(repo, leased, "suppressed", now);
    return;
  }
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": job.path.split("/").at(-1)!,
      },
      body: JSON.stringify(leased.data.payload),
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const result = await response.json();
      await stop(repo, leased, "accepted", now, String(result.id ?? ""));
    } else if (response.status !== 429 && response.status < 500)
      await stop(repo, leased, "failed", now);
    // Network errors and 429/5xx retain the identical payload and key for a bounded retry.
  } catch {
    /* An ambiguous response is retried only inside the provider's 24-hour idempotency window. */
  }
}
export async function reserveJob(
  repo: Repository,
  id: string,
  job: Job,
  now: Date,
) {
  const existing = await repo.get<Job>(`mailJobs/${id}`);
  if (existing) return existing;
  const day = now.toISOString().slice(0, 10),
    month = day.slice(0, 7),
    [daily, monthly] = await Promise.all([
      repo.get(`mailRuntime/day-${day}`),
      repo.get(`mailRuntime/month-${month}`),
    ]);
  const cfg = await repo.get("config/email"),
    dailyLimit = Math.min(
      DAILY_LIMIT,
      Math.max(1, Number(cfg?.data.dailyLimit) || DAILY_LIMIT),
    ),
    monthlyLimit = Math.min(
      MONTHLY_LIMIT,
      Math.max(1, Number(cfg?.data.monthlyLimit) || MONTHLY_LIMIT),
    );
  if (
    Number(daily?.data.count ?? 0) >= dailyLimit ||
    Number(monthly?.data.count ?? 0) >= monthlyLimit
  )
    return null;
  const writes = [
    { path: `mailJobs/${id}`, data: job, version: null },
    {
      path: `mailRuntime/day-${day}`,
      data: { count: Number(daily?.data.count ?? 0) + 1 },
      version: daily?.version ?? null,
    },
    {
      path: `mailRuntime/month-${month}`,
      data: { count: Number(monthly?.data.count ?? 0) + 1 },
      version: monthly?.version ?? null,
    },
  ];
  if (!(await repo.commit(writes))) return null;
  return repo.get<Job>(`mailJobs/${id}`);
}
async function automatic(
  repo: Repository,
  event: Document,
  env: Env,
  now: Date,
  fetcher = fetch,
) {
  const uid = String(event.data.uid),
    kind = event.data.kind,
    eventId = event.path.split("/").at(-1)!;
  const finish = (state: string) =>
    repo.commit([
      {
        path: event.path,
        version: event.version,
        data: { uid, state, createdAt: event.data.createdAt, finishedAt: now },
      },
    ]);
  const [family, pref, deleted] = await Promise.all([
    repo.get<{ name: string }>(`families/${uid}`, ["name"]),
    repo.get<EmailPreferences>(`emailPreferences/${uid}`),
    repo.get(`accountDeletion/${uid}`),
  ]);
  if (
    !family ||
    deleted ||
    pref?.data.enabled === false ||
    pref?.data.unsubscribed ||
    !["welcome", "levelCompleted"].includes(String(kind))
  ) {
    await finish("suppressed");
    return;
  }
  // A verified account can claim its welcome later. Event IDs make concurrent devices idempotent.
  const maxAge = kind === "welcome" ? 30 * DAY : 2 * DAY;
  if (now.getTime() - when(event.data.createdAt) > maxAge) {
    await finish("expired");
    return;
  }
  const account = await repo.account(uid);
  if (account?.disabled) {
    await finish("suppressed");
    return;
  }
  if (!account?.verified || !account.email) {
    await repo.commit([
      {
        path: event.path,
        version: event.version,
        data: {
          ...event.data,
          nextAttemptAt: new Date(now.getTime() + 3600000),
        },
      },
    ]);
    return;
  }
  let levelTitle = "";
  if (kind === "levelCompleted") {
    const id = String(event.data.levelId),
      [level, progress] = await Promise.all([
        repo.get<{ title: string }>(`levels/${id}`, ["title"]),
        repo.get(`families/${uid}/progress/${id}`, ["finishedAt"]),
      ]);
    if (!level || !progress?.data.finishedAt) {
      await finish("suppressed");
      return;
    }
    levelTitle = level.data.title;
  }
  const settings = settingsOf((await repo.get("config/email"))?.data),
    draft = eventEmailDraft(
      kind as "welcome" | "levelCompleted",
      family.data.name,
      levelTitle,
      settings,
    );
  if (!draft) {
    await finish("suppressed");
    return;
  }
  const job = await reserveJob(
    repo,
    `event-${eventId}`,
    {
      uid,
      eventId,
      categories: draft.categories,
      consentVersion: pref?.data.version ?? 0,
      payload: await emailPayload(
        uid,
        account.email,
        draft,
        env,
        now,
        settings,
      ),
      createdAt: now,
      nextAttemptAt: now,
      terminal: false,
      attempts: 0,
    },
    now,
  );
  if (job?.data.terminal) await finish(String(job.data.state ?? "accepted"));
  else if (job) await deliverJob(repo, job, env, now, fetcher);
}
async function administrator(
  repo: Repository,
  q: Document,
  env: Env,
  now: Date,
  fetcher = fetch,
) {
  const uid = String(q.data.uid),
    pref = await repo.get<EmailPreferences>(`emailPreferences/${uid}`);
  const sender = await repo.get(`roles/${String(q.data.senderUid)}`),
    deleted = await repo.get(`accountDeletion/${uid}`),
    account = await repo.account(uid);
  if (
    now.getTime() - when(q.data.createdAt) > 2 * DAY ||
    pref?.data.enabled === false ||
    pref?.data.unsubscribed ||
    !hasPermission(sender?.data ?? {}, "emails.send") ||
    deleted ||
    !!(await repo.get(`accountDeletion/${String(q.data.senderUid)}`)) ||
    !account?.verified ||
    account.disabled ||
    !account.email
  ) {
    await repo.commit([
      {
        path: q.path,
        version: q.version,
        data: {
          uid,
          state: "suppressed",
          createdAt: q.data.createdAt,
          finishedAt: now,
        },
      },
    ]);
    return;
  }
  const draft: EmailDraft = {
      subject: String(q.data.title),
      lines: [String(q.data.body)],
      categories: ["adminMessages"],
    },
    queueId = q.path.split("/").at(-1)!;
  const settings = settingsOf((await repo.get("config/email"))?.data);
  const payload = await emailPayload(
      uid,
      account.email,
      draft,
      env,
      now,
      settings,
    ),
    job = await reserveJob(
      repo,
      `admin-${queueId}`,
      {
        uid,
        queueId,
        categories: draft.categories,
        consentVersion: pref?.data.version ?? 0,
        payload,
        createdAt: now,
        nextAttemptAt: now,
        terminal: false,
        attempts: 0,
      },
      now,
    );
  if (job?.data.terminal)
    await repo.commit([
      {
        path: q.path,
        version: q.version,
        data: {
          uid,
          state: job.data.state ?? "accepted",
          createdAt: q.data.createdAt,
          finishedAt: now,
        },
      },
    ]);
  else if (job) await deliverJob(repo, job, env, now, fetcher);
}
/** One delivery per trigger keeps free-plan subrequests and CPU bounded; no full-family scans. */
export async function runCycle(
  repo: Repository,
  env: Env,
  now = new Date(),
  fetcher = fetch,
) {
  const status = await repo.get("config/email");
  let settings: EmailSettings;
  try {
    settings = settingsOf(status?.data);
  } catch {
    await repo.commit([
      {
        path: "config/email",
        version: status?.version ?? null,
        data: { ...status?.data, enabled: false, lastRunAt: now },
      },
    ]);
    return;
  }
  const configured = ready(env) && !!senderFor(env, settings);
  await repo.commit([
    {
      path: "config/email",
      version: status?.version ?? null,
      data: {
        ...status?.data,
        ...settings,
        verifiedSenderDomain: env.FROM_EMAIL.match(/@([^<>]+)>/)?.[1] ?? "",
        enabled: env.SEND_ENABLED === "true" && configured,
        paused: status?.data.paused === true,
        dailyLimit: settings.dailyLimit,
        monthlyLimit: settings.monthlyLimit,
        lastRunAt: now,
      },
    },
  ]);
  if (!configured || env.SEND_ENABLED !== "true" || status?.data.paused) return;
  const retry = await repo.query<Job>(
    "mailJobs",
    [
      { field: "terminal", op: "EQUAL", value: false },
      { field: "nextAttemptAt", op: "LESS_THAN_OR_EQUAL", value: now },
    ],
    1,
  );
  if (retry[0]) {
    await deliverJob(repo, retry[0], env, now, fetcher);
    return;
  }
  const auto = async () => {
    const due = await repo.query(
      "mailEvents",
      [
        { field: "state", op: "EQUAL", value: "pending" },
        { field: "nextAttemptAt", op: "LESS_THAN_OR_EQUAL", value: now },
      ],
      1,
    );
    if (due[0]) {
      await automatic(repo, due[0], env, now, fetcher);
      return true;
    }
    return false;
  };
  const admin = async () => {
    if (!settings.adminMessagesEnabled) return false;
    const queue = await repo.query(
      "emailQueue",
      [{ field: "state", op: "EQUAL", value: "pending" }],
      1,
    );
    if (queue[0]) {
      await administrator(repo, queue[0], env, now, fetcher);
      return true;
    }
    return false;
  };
  if (Math.floor(now.getTime() / 600000) % 2 === 0) {
    if (!(await auto())) await admin();
  } else if (!(await admin())) await auto();
}
export default {
  async scheduled(
    _event: unknown,
    env: Env,
    ctx: { waitUntil(p: Promise<unknown>): void },
  ) {
    if (!env.GOOGLE_SERVICE_ACCOUNT) return;
    ctx.waitUntil(
      googleRepository(env)
        .then((repo) => runCycle(repo, env))
        .catch(() =>
          console.error(
            "Email cycle failed; inspect configuration and provider status. No recipient data logged.",
          ),
        ),
    );
  },
  async fetch(request: Request, env: Env) {
    if (new URL(request.url).pathname !== "/unsubscribe")
      return Response.json(
        {
          service: "Amor que permanece correo",
          configured: ready(env),
          sending: ready(env) && env.SEND_ENABLED === "true",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    if (!env.GOOGLE_SERVICE_ACCOUNT || !env.UNSUBSCRIBE_SECRET)
      return new Response("Servicio aún no configurado", { status: 503 });
    if (request.method === "GET")
      return unsubscribe(request, env, {} as Repository);
    const url = new URL(request.url);
    if (
      !(await validToken(
        url.searchParams.get("uid") ?? "",
        url.searchParams.get("token") ?? "",
        env.UNSUBSCRIBE_SECRET,
        new Date(),
      ))
    )
      return new Response("Enlace inválido o vencido", { status: 400 });
    try {
      return await unsubscribe(request, env, await googleRepository(env));
    } catch {
      return new Response(
        "No pudimos guardar la baja. Inténtalo otra vez o usa Nosotros en la app.",
        { status: 503 },
      );
    }
  },
};

export { toValue, fromValue, googleRepository } from "./google";
