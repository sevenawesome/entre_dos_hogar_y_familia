import {
  defaultEmailSettings,
  validateEmailSettings,
  type EmailSettings,
} from "../../src/domain/email-settings";
import { hasPermission } from "../../src/domain/admin-permissions";
import {
  dailyEmailDraft,
  emailDay,
  nextEmailDate,
  type EmailDraft,
  type EmailPreferences,
} from "../../src/domain/email-reminders";
import type { Family, FamilySummary, Level } from "../../src/domain/types";
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
  return validateEmailSettings({ ...defaultEmailSettings, ...data });
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
      "Enlace inválido o vencido. También puedes desactivar los correos desde Nosotros en ENTRE DOS.",
      { status: 400, headers },
    );
  if (request.method === "GET")
    return new Response(
      '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width"><title>Correos de ENTRE DOS</title><body style="font:18px system-ui;max-width:550px;margin:60px auto;padding:24px"><h1>Sus correos, a su ritmo.</h1><p>Confirma para dejar de recibir correos opcionales de retos, celebraciones y administración. Los correos de acceso seguirán disponibles.</p><form method="post"><button style="padding:18px;border:0;border-radius:14px;background:#B82E63;color:white;font-size:18px">Dejar de recibir correos opcionales</button></form></body></html>',
      { headers },
    );
  if (request.method !== "POST")
    return new Response("Método no permitido", { status: 405, headers });
  const pref = await repo.get(`emailPreferences/${uid}`);
  if (
    pref &&
    !(await repo.commit([
      {
        path: pref.path,
        version: pref.version,
        data: {
          ...pref.data,
          enabled: false,
          challenges: false,
          celebrations: false,
          adminMessages: false,
          version: Number(pref.data.version) + 1,
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
    "<html lang=es><title>Baja confirmada</title><p>Correos opcionales desactivados. Pueden volver a elegirlos desde Nosotros en ENTRE DOS.</p></html>",
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
  const text = `ENTRE DOS · By Departamento de Hogar y Familia\n\n${draft.lines.join("\n\n")}\n\nDejar de recibir correos opcionales: ${link}\nCreado por SevenAwesome · https://www.sevenawesome.com/`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#FFF6F8;color:#343047;font:16px Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:32px"><h1 style="color:#B82E63">♡ ENTRE DOS</h1><p>By Departamento de Hogar y Familia</p><div style="background:white;border-radius:22px;padding:26px"><h2>${escapeHtml(draft.subject)}</h2>${draft.lines.map((line) => `<p style="line-height:1.7">${escapeHtml(line).replace(/\n/g, "<br>")}</p>`).join("")}</div><p style="font-size:13px;line-height:1.7">Reciben este correo porque su cuenta familiar lo autorizó. <a href="${escapeHtml(link)}">Dejar de recibir correos opcionales</a>.</p><p style="font-size:13px">Creado por <a href="https://www.sevenawesome.com/">SevenAwesome</a></p></div></body></html>`;
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
  progressKey?: string;
  familyVersion?: string;
  localDay?: string;
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
  if (saved && job.data.queueId) {
    const q = await repo.get(`emailQueue/${job.data.queueId}`);
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
async function eligible(repo: Repository, job: Job, now: Date) {
  const prefs = await repo.get<EmailPreferences>(`emailPreferences/${job.uid}`);
  if (
    !prefs?.data.enabled ||
    prefs.data.version !== job.consentVersion ||
    job.categories.some((c) => !prefs.data[c])
  )
    return false;
  if (await repo.get(`accountDeletion/${job.uid}`)) return false;
  if (job.familyVersion) {
    const [family, summary, controls, app] = await Promise.all([
      repo.get(`families/${job.uid}`),
      repo.get(`tracking/${job.uid}`),
      repo.get(`familyControls/${job.uid}`),
      repo.get("config/app"),
    ]);
    if (
      family?.version !== job.familyVersion ||
      `${summary?.data.totalCompleted}|${summary?.data.finishedCount}` !==
        job.progressKey ||
      controls?.data.remindersPaused ||
      app?.data.notificationsEnabled === false ||
      emailDay(prefs.data.timezone, now) !== job.localDay
    )
      return false;
  }
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
  const config = await repo.get("config/email"),
    appConfig = await repo.get("config/app");
  if (
    appConfig?.data.notificationsEnabled === false ||
    !config?.data.enabled ||
    (job.data.queueId
      ? config.data.adminMessagesEnabled === false
      : config.data.automaticEnabled === false) ||
    config.data.paused ||
    env.SEND_ENABLED !== "true"
  )
    return;
  if (!(await eligible(repo, job.data, now))) {
    await stop(repo, job, "suppressed", now);
    return;
  }
  if (job.data.queueId) {
    const q = await repo.get(`emailQueue/${job.data.queueId}`),
      sender = q?.data.senderUid as string | undefined,
      role = sender ? await repo.get(`roles/${sender}`) : null;
    if (
      !hasPermission(role?.data ?? {}, "messages.send") ||
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
  pref: Document<EmailPreferences>,
  env: Env,
  now: Date,
  fetcher = fetch,
) {
  const uid = pref.path.split("/").at(-1)!;
  if (!pref.data.enabled) return;
  const [family, summary, journey, deleted, controls] = await Promise.all([
    repo.get<Family>(`families/${uid}`),
    repo.get<FamilySummary>(`tracking/${uid}`),
    repo.get(`journeys/${uid}`),
    repo.get(`accountDeletion/${uid}`),
    repo.get(`familyControls/${uid}`),
  ]);
  if (!family || !summary || deleted) {
    await repo.commit([
      {
        path: pref.path,
        version: pref.version,
        data: {
          ...pref.data,
          enabled: false,
          version: pref.data.version + 1,
          nextDueAt: new Date(now.getTime() + DAY),
          updatedAt: now,
        },
      },
    ]);
    return;
  }
  let next: Date;
  try {
    next = nextEmailDate(
      pref.data.timezone,
      pref.data.hour,
      pref.data.minute,
      now,
    );
  } catch {
    await repo.commit([
      {
        path: pref.path,
        version: pref.version,
        data: {
          ...pref.data,
          enabled: false,
          version: pref.data.version + 1,
          nextDueAt: new Date(now.getTime() + DAY),
          updatedAt: now,
        },
      },
    ]);
    return;
  }
  const advance = () =>
    repo.commit([
      {
        path: pref.path,
        version: pref.version,
        data: { ...pref.data, nextDueAt: next },
      },
    ]);
  if (controls?.data.remindersPaused) {
    await advance();
    return;
  }
  const [catalog, progress] = await Promise.all([
    repo.query<Level>(
      "levels",
      [{ field: "published", op: "EQUAL", value: true }],
      200,
      ["id", "title", "order", "prerequisiteId", "published"],
    ),
    repo.query<{ levelId: string; finishedAt: unknown }>(
      `families/${uid}/progress`,
      [],
      200,
      ["levelId", "finishedAt"],
    ),
  ]);
  const finished = progress
      .filter((p) => p.data.finishedAt)
      .map((p) => p.data.levelId),
    levels = catalog.map(
      (p) =>
        ({
          ...p.data,
          challenges: [],
          questions: [],
          subtitle: "",
          description: "",
        }) as Level,
    );
  const current = levels
    .sort((a, b) => a.order - b.order)
    .find(
      (l) =>
        !finished.includes(l.id) &&
        (!l.prerequisiteId || finished.includes(l.prerequisiteId)),
    );
  if (current) {
    const detail = await repo.get<Pick<Level, "challenges">>(
      `levels/${current.id}`,
      ["challenges"],
    );
    current.challenges = detail?.data.challenges ?? [];
  }
  const normalized = {
    ...summary.data,
    lastCompletedAt: summary.data.lastCompletedAt
      ? new Date(when(summary.data.lastCompletedAt)).toISOString()
      : null,
  };
  const settings = settingsOf((await repo.get("config/email"))?.data);
  const draft = dailyEmailDraft(
    family.data,
    pref.data,
    normalized,
    levels,
    finished,
    !!journey || summary.data.totalCompleted > 0,
    now,
    settings,
  );
  if (!draft) {
    await advance();
    return;
  }
  const account = await repo.account(uid);
  if (!account?.verified || account.disabled || !account.email) {
    await advance();
    return;
  }
  const id = `auto-${uid}-${emailDay(pref.data.timezone, now)}`;
  const payload = await emailPayload(
    uid,
    account.email,
    draft,
    env,
    now,
    settings,
  );
  const job = await reserveJob(
    repo,
    id,
    {
      uid,
      categories: draft.categories,
      consentVersion: pref.data.version,
      payload,
      createdAt: now,
      nextAttemptAt: now,
      terminal: false,
      attempts: 0,
      familyVersion: family.version,
      progressKey: `${summary.data.totalCompleted}|${summary.data.finishedCount}`,
      localDay: emailDay(pref.data.timezone, now),
    },
    now,
  );
  if (job) {
    await advance();
    await deliverJob(repo, job, env, now, fetcher);
  }
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
    !pref?.data.enabled ||
    !pref.data.adminMessages ||
    !hasPermission(sender?.data ?? {}, "messages.send") ||
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
        consentVersion: pref.data.version,
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
  const appConfig = await repo.get("config/app");
  if (
    !configured ||
    env.SEND_ENABLED !== "true" ||
    status?.data.paused ||
    appConfig?.data.notificationsEnabled === false
  )
    return;
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
    if (!settings.automaticEnabled) return false;
    const due = await repo.query<EmailPreferences>(
      "emailPreferences",
      [
        { field: "enabled", op: "EQUAL", value: true },
        { field: "nextDueAt", op: "LESS_THAN_OR_EQUAL", value: now },
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
          service: "ENTRE DOS correo",
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
