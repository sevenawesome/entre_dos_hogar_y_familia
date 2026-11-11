import { test } from "node:test";
import assert from "node:assert/strict";
import worker, {
  communityRequest,
  sendAnniversaryGreeting,
  greetingId,
  authEmailRequest,
  reserveAuthEmail,
  brandedEmail,
} from "../.cache/email-worker/index.js";
const now = new Date("2026-11-10T20:00:00Z"),
  env = {
    FIREBASE_PROJECT_ID: "demo-entre-dos",
    PUBLIC_BASE_URL: "https://mail.example.workers.dev",
    FROM_EMAIL: "Amor <avisos@correo.example.com>",
    RESEND_API_KEY: "test",
    UNSUBSCRIBE_SECRET: "test-secret-not-real-12345678901234567890",
    SEND_ENABLED: "true",
    AUTH_EMAIL_ENABLED: "true",
  };
class Memory {
  docs = new Map();
  revision = 0;
  seed(path, data) {
    this.docs.set(path, {
      path,
      data: structuredClone(data),
      version: String(++this.revision),
    });
  }
  async get(p) {
    return structuredClone(this.docs.get(p) ?? null);
  }
  async accountInfo(uid) {
    return {
      uid,
      email: `${uid}@example.com`,
      verified: true,
      disabled: false,
      validSince: 0,
      ...this.account,
    };
  }
  async commit(writes) {
    if (
      writes.some((w) => (this.docs.get(w.path)?.version ?? null) !== w.version)
    )
      return false;
    for (const w of writes) this.seed(w.path, w.data);
    return true;
  }
}
const setup = () => {
  const r = new Memory();
  for (const uid of ["a", "b"]) {
    r.seed(`community/${uid}`, {
      alias: `Familia ${uid}`,
      visible: true,
      shareAnniversary: true,
      marriageDate: "2016-11-10",
      timezone: "America/La_Paz",
    });
    r.seed(`families/${uid}`, { name: uid });
  }
  return r;
};
const verify = async () => ({ sub: "a", auth_time: 1, email_verified: true });
const request = (path, body, token = "valid") =>
  new Request(`https://service.test/${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.1",
    },
    body: JSON.stringify(body),
  });
test("anniversary greeting creates a private memory and notification atomically, only once across phones", async () => {
  const r = setup();
  const results = await Promise.all([
    sendAnniversaryGreeting(
      r,
      "a",
      { recipientUid: "b", body: "¡Muchas felicidades!" },
      now,
    ),
    sendAnniversaryGreeting(
      r,
      "a",
      { recipientUid: "b", body: "Segundo intento" },
      now,
    ),
  ]);
  assert.equal(results.filter((x) => !x.alreadySent).length, 1);
  const archive = [...r.docs.values()].filter((d) =>
    d.path.startsWith("anniversaryMessages/"),
  );
  assert.equal(archive.length, 1);
  assert.equal(archive[0].data.years, 10);
  assert.equal(archive[0].data.anniversaryDate, "2026-11-10");
  assert.equal(archive[0].data.senderAlias, "Familia a");
  assert.equal(
    [...r.docs.keys()].filter((p) => p.includes("/inbox/")).length,
    1,
  );
  assert.equal(
    (
      await sendAnniversaryGreeting(
        r,
        "a",
        { recipientUid: "b", body: "Repetido" },
        now,
      )
    ).alreadySent,
    true,
  );
});
test("each family and anniversary has its own greeting; old years remain", async () => {
  const r = setup();
  await sendAnniversaryGreeting(
    r,
    "a",
    { recipientUid: "b", body: "Año uno" },
    now,
  );
  await sendAnniversaryGreeting(
    r,
    "a",
    { recipientUid: "b", body: "Año dos" },
    new Date("2027-11-10T20:00:00Z"),
  );
  assert.equal(
    [...r.docs.keys()].filter((p) => p.startsWith("anniversaryMessages/"))
      .length,
    2,
  );
  assert.notEqual(
    await greetingId("a", "b", "2026-11-10"),
    await greetingId("b", "a", "2026-11-10"),
  );
});
test("greetings reject self, private profiles, deleted recipients, wrong dates and oversized text", async () => {
  for (const change of [
    (r) => r.seed("community/b", { visible: false }),
    (r) => r.seed("accountDeletion/b", {}),
    (r) => r.seed("community/a", { visible: false }),
    (r) => r.seed("community/b", { visible: true, shareAnniversary: false }),
  ]) {
    const r = setup();
    change(r);
    await assert.rejects(
      sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Hola" }, now),
    );
    assert.equal(
      [...r.docs.keys()].some((p) => p.includes("inbox")),
      false,
    );
  }
  for (const input of [
    { recipientUid: "a", body: "Hola" },
    { recipientUid: "b", body: " " },
    { recipientUid: "b", body: "X".repeat(1001) },
    { recipientUid: "../b", body: "Hola" },
  ])
    await assert.rejects(sendAnniversaryGreeting(setup(), "a", input, now));
  await assert.rejects(
    sendAnniversaryGreeting(
      setup(),
      "a",
      { recipientUid: "b", body: "Hola" },
      new Date("2026-11-11T04:01:00Z"),
    ),
  );
});
test("greeting uses recipient timezone and February 29 policy", async () => {
  const r = setup();
  r.seed("community/b", {
    visible: true,
    shareAnniversary: true,
    marriageDate: "2020-02-29",
    timezone: "America/La_Paz",
  });
  await sendAnniversaryGreeting(
    r,
    "a",
    { recipientUid: "b", body: "¡Felicidades!" },
    new Date("2027-03-01T02:00:00Z"),
  );
  assert.equal(
    [...r.docs.values()].find((d) => d.path.startsWith("anniversaryMessages/"))
      .data.anniversaryDate,
    "2027-02-28",
  );
});
test("greeting endpoint requires a live, verified, unrevoked account", async () => {
  for (const account of [
    { verified: false },
    { disabled: true },
    { validSince: 2 },
  ]) {
    const r = setup();
    r.account = account;
    assert.equal(
      (
        await communityRequest(
          request("community/anniversary-message", {
            recipientUid: "b",
            body: "Hola",
          }),
          env,
          r,
          verify,
          now,
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await communityRequest(
        request("community/anniversary-message", {}, null),
        env,
        setup(),
        verify,
        now,
      )
    ).status,
    401,
  );
  const r = setup();
  r.seed("accountDeletion/a", {});
  assert.equal(
    (
      await communityRequest(
        request("community/anniversary-message", {}),
        env,
        r,
        verify,
        now,
      )
    ).status,
    403,
  );
});
test("branded security mail uses owned logo, escaped text and an HTTPS button without unsubscribe", () => {
  const html = brandedEmail({
    title: "Confirmar <cuenta>",
    lines: ["<script>test</script>"],
    byline: "By Hogar y Familia",
    baseUrl: env.PUBLIC_BASE_URL,
    action: {
      title: "Verificar",
      url: "https://demo-entre-dos.firebaseapp.com/__/auth/action?oobCode=fake",
    },
  });
  assert.match(html, /assets\/logo.png/);
  assert.match(html, /#9A3F50/);
  assert.match(html, /By Hogar y Familia/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|Dejar de recibir/);
  assert.throws(() =>
    brandedEmail({
      title: "X",
      lines: [],
      byline: "",
      baseUrl: env.PUBLIC_BASE_URL,
      action: { title: "X", url: "javascript:alert(1)" },
    }),
  );
});
test("free mail quota is shared with other messages and reserves atomically", async () => {
  const r = new Memory(),
    limits = { dailyLimit: 90, monthlyLimit: 2700 };
  r.seed("mailRuntime/day-2026-11-10", { count: 89 });
  const values = await Promise.all([
    reserveAuthEmail(r, "e1", "ip1", now, limits),
    reserveAuthEmail(r, "e2", "ip2", now, limits),
  ]);
  assert.equal(values.filter((x) => x === "reserved").length, 1);
  assert.equal(r.docs.get("mailRuntime/day-2026-11-10").data.count, 90);
  assert.equal(await reserveAuthEmail(r, "e3", "ip3", now, limits), "quota");
});
test("security mail enforces cooldown and daily address limits", async () => {
  const r = new Memory(),
    limits = { dailyLimit: 90, monthlyLimit: 2700 };
  assert.equal(await reserveAuthEmail(r, "a", "ip", now, limits), "reserved");
  assert.equal(await reserveAuthEmail(r, "a", "ip", now, limits), "limited");
  for (let i = 1; i < 5; i++)
    assert.equal(
      await reserveAuthEmail(r, "a", "ip", new Date(+now + i * 60001), limits),
      "reserved",
    );
  assert.equal(
    await reserveAuthEmail(r, "a", "ip", new Date(+now + 3600000), limits),
    "limited",
  );
});
test("security mail never sends when disabled, quota full or Google unavailable; falls back to Firebase", async () => {
  const r = setup();
  let sends = 0;
  const deps = {
    verify,
    link: async () => {
      throw Error("denied");
    },
    fetcher: async () => {
      sends++;
      throw Error("No send");
    },
  };
  for (const cfg of [
    { ...env, SEND_ENABLED: "false" },
    { ...env, AUTH_EMAIL_ENABLED: "false" },
    env,
  ])
    assert.equal(
      (
        await (
          await authEmailRequest(
            request("auth/email/recovery", { email: "a@example.com" }),
            cfg,
            r,
            now,
            deps,
          )
        ).json()
      ).provider,
      "firebase",
    );
  assert.equal(sends, 0);
  const disabled = await worker.fetch(
    request("auth/email/recovery", { email: "a@example.com" }),
    { ...env, SEND_ENABLED: "false" },
  );
  assert.equal((await disabled.json()).provider, "firebase");
});
test("security links are generated in memory only; response hides account existence", async () => {
  const r = setup();
  let payload;
  const deps = {
    verify,
    link: async () =>
      "https://demo-entre-dos.firebaseapp.com/__/auth/action?oobCode=never-store-this",
    fetcher: async (_url, options) => {
      payload = JSON.parse(options.body);
      return new Response('{"id":"test"}', { status: 200 });
    },
  };
  const answer = await (
    await authEmailRequest(
      request("auth/email/recovery", { email: "a@example.com" }),
      env,
      r,
      now,
      deps,
    )
  ).json();
  assert.deepEqual(answer, { ok: true, provider: "resend" });
  assert.match(payload.html, /assets\/logo.png/);
  assert.match(payload.html, /Cambiar contraseña/);
  assert.doesNotMatch(
    JSON.stringify([...r.docs.values()]),
    /never-store-this|a@example.com|192.0.2.1/,
  );
  const unknown = await (
    await authEmailRequest(
      request("auth/email/recovery", { email: "unknown@example.com" }),
      env,
      new Memory(),
      now,
      { ...deps, link: async () => null },
    )
  ).json();
  assert.deepEqual(unknown, answer);
});
