import {
  defaultEmailSettings,
  validateEmailSettings,
  migrateEmailBrand,
} from "../../src/domain/email-settings";
import { defaultBranding, validateBranding } from "../../src/domain/branding";
import { accessToken, type Env, type Repository } from "./google";
import type { AccountsRepository } from "./accounts-google";
import { requireMember, MemberError } from "./member-auth";
import { accountsHeaders } from "./account-admin";
import { brandedEmail } from "./email-brand";
import { verifyFirebaseToken } from "./firebase-token";
const fallback = () =>
  Response.json(
    { ok: true, provider: "firebase" },
    { headers: accountsHeaders },
  );
const accepted = () =>
  Response.json({ ok: true, provider: "resend" }, { headers: accountsHeaders });
async function hash(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
/** Shared conservative free-tier counters; no action link, address or IP is persisted. */
export async function reserveAuthEmail(
  repo: Repository,
  emailKey: string,
  ipKey: string,
  now: Date,
  limits: { dailyLimit: number; monthlyLimit: number },
) {
  const day = now.toISOString().slice(0, 10),
    month = day.slice(0, 7);
  const paths = [
    `mailRuntime/day-${day}`,
    `mailRuntime/month-${month}`,
    `authMailRate/email-${emailKey}`,
    `authMailRate/ip-${ipKey}`,
  ];
  const docs = await Promise.all(paths.map((p) => repo.get(p)));
  if (
    Number(docs[0]?.data.count ?? 0) >= Math.min(90, limits.dailyLimit) ||
    Number(docs[1]?.data.count ?? 0) >= Math.min(2700, limits.monthlyLimit)
  )
    return "quota";
  const count = (i: number) =>
    docs[i]?.data.day === day ? Number(docs[i]?.data.count ?? 0) : 0;
  if (
    count(2) >= 5 ||
    count(3) >= 10 ||
    now.getTime() - Number(docs[2]?.data.lastAt ?? 0) < 60000
  )
    return "limited";
  return (await repo.commit(
    paths.map((path, i) => ({
      path,
      version: docs[i]?.version ?? null,
      data:
        i < 2
          ? { count: Number(docs[i]?.data.count ?? 0) + 1 }
          : { day, count: count(i) + 1, lastAt: now.getTime() },
    })),
  ))
    ? "reserved"
    : "limited";
}
export async function generateAuthLink(
  env: Env,
  email: string,
  kind: "verification" | "recovery",
  fetcher = fetch,
) {
  const token = await accessToken(env, fetcher);
  const response = await fetcher(
    "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Firebase-Locale": "es",
      },
      body: JSON.stringify({
        requestType:
          kind === "verification" ? "VERIFY_EMAIL" : "PASSWORD_RESET",
        email,
        targetProjectId: env.FIREBASE_PROJECT_ID,
        returnOobLink: true,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await response.json();
  if (result.error?.message === "EMAIL_NOT_FOUND") return null;
  if (!response.ok || typeof result.oobLink !== "string")
    throw Error("Action link unavailable");
  const link = new URL(result.oobLink);
  if (
    link.protocol !== "https:" ||
    link.hostname !== `${env.FIREBASE_PROJECT_ID}.firebaseapp.com` ||
    link.pathname !== "/__/auth/action"
  )
    throw Error("Unexpected action host");
  return link.href;
}
export async function authEmailRequest(
  request: Request,
  env: Env,
  repo: AccountsRepository,
  now = new Date(),
  deps = {
    verify: verifyFirebaseToken,
    link: generateAuthLink,
    fetcher: fetch,
  },
) {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: accountsHeaders });
  if (request.method !== "POST")
    return new Response(null, { status: 405, headers: accountsHeaders });
  if (
    env.SEND_ENABLED !== "true" ||
    env.AUTH_EMAIL_ENABLED !== "true" ||
    !env.RESEND_API_KEY ||
    !env.UNSUBSCRIBE_SECRET
  )
    return fallback();
  const kind = new URL(request.url).pathname.endsWith("/verification")
    ? "verification"
    : "recovery";
  try {
    let email: string;
    if (kind === "verification") {
      const member = await requireMember(
        request,
        env,
        repo,
        now,
        deps.verify,
        false,
      );
      if (member.account.verified) return accepted();
      email = member.account.email;
    } else {
      const raw = await request.text();
      if (raw.length > 512) return accepted();
      let input;
      try {
        input = JSON.parse(raw);
      } catch {
        return accepted();
      }
      email = typeof input?.email === "string" ? input.email.trim() : "";
    }
    if (
      email.length > 150 ||
      !/^([^\s<>@]+)@([^\s<>@]+)\.[^\s<>@]+$/.test(email)
    )
      return accepted();
    const settings = validateEmailSettings(
      migrateEmailBrand({
        ...defaultEmailSettings,
        ...(await repo.get("config/email"))?.data,
      }),
    );
    if (settings.paused) return fallback();
    const original = env.FROM_EMAIL.match(/<([^<>\s]+@([^<>\s@]+))>/),
      address = settings.fromEmail || original?.[1];
    if (
      !original ||
      !address ||
      address.split("@")[1].toLowerCase() !== original[2].toLowerCase()
    )
      return fallback();
    const rate = await reserveAuthEmail(
      repo,
      await hash(email.toLowerCase(), env.UNSUBSCRIBE_SECRET),
      await hash(
        request.headers.get("CF-Connecting-IP") ?? "unknown",
        env.UNSUBSCRIBE_SECRET,
      ),
      now,
      settings,
    );
    if (rate === "quota") return fallback();
    if (rate === "limited") return accepted(); // Same response for unknown and existing accounts.
    const link = await deps.link(env, email, kind, deps.fetcher);
    if (!link) return accepted();
    const byline = validateBranding({
      ...defaultBranding,
      ...(await repo.get("config/branding"))?.data,
    }).byline;
    const title =
      kind === "verification"
        ? "Confirmen su correo"
        : "Recuperen el acceso a su cuenta";
    const lines =
      kind === "verification"
        ? [
            "¡Bienvenidos a Amor que permanece! Confirmen este correo para cuidar el acceso a su cuenta familiar.",
            "Al terminar, vuelvan a Nosotros en la app y pulsen «Ya confirmé mi correo».",
          ]
        : [
            "Recibimos una solicitud para cambiar la contraseña de su cuenta familiar.",
            "Elijan una contraseña nueva en el enlace seguro. Si no solicitaron este cambio, pueden ignorar este mensaje.",
          ];
    const sent = await deps.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `auth-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        from: `${settings.fromName} <${address}>`,
        reply_to: settings.replyTo,
        to: [email],
        subject: title,
        text: `Amor que permanece\n${byline}\n\n${lines.join("\n\n")}\n\n${link}`,
        html: brandedEmail({
          title,
          lines,
          byline,
          baseUrl: env.PUBLIC_BASE_URL,
          action: {
            title:
              kind === "verification"
                ? "Verificar nuestro correo"
                : "Cambiar contraseña",
            url: link,
          },
        }),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!sent.ok) return fallback();
    return accepted();
  } catch (e) {
    if (e instanceof MemberError)
      return Response.json(
        { error: e.message },
        { status: e.status, headers: accountsHeaders },
      );
    return fallback(); // Firebase remains the free recovery path if the custom service is unavailable.
  }
}
