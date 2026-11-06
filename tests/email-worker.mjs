import { test } from "node:test";
import assert from "node:assert/strict";
import worker, {
  runCycle,
  reserveJob,
  deliverJob,
  emailPayload,
  unsubscribeToken,
  unsubscribe,
  toValue,
  fromValue,
  googleRepository,
} from "../.cache/email-worker/index.js";
const now = new Date("2026-11-06T16:00:00Z");
const env = {
  FIREBASE_PROJECT_ID: "demo-entre-dos",
  GOOGLE_SERVICE_ACCOUNT: "only-a-test-placeholder",
  RESEND_API_KEY: "test-not-a-real-key",
  UNSUBSCRIBE_SECRET: "a-local-only-secret-that-is-longer-than-32-characters",
  PUBLIC_BASE_URL: "https://entre-dos.test.workers.dev",
  FROM_EMAIL: "ENTRE DOS <test@example.com>",
  SEND_ENABLED: "true",
};
class Memory {
  docs = new Map();
  accounts = new Map();
  revision = 0;
  calls = 0;
  masks = [];
  seed(path, data) {
    this.docs.set(path, {
      path,
      data: structuredClone(data),
      version: String(++this.revision),
    });
  }
  async get(path, mask) {
    this.calls++;
    if (mask) this.masks.push(mask);
    return structuredClone(this.docs.get(path) ?? null);
  }
  async query(collection, filters, limit, mask) {
    this.calls++;
    if (mask) this.masks.push(mask);
    return structuredClone(
      [...this.docs.values()]
        .filter(
          (d) =>
            d.path.startsWith(collection + "/") &&
            d.path.split("/").length === collection.split("/").length + 1 &&
            filters.every((f) =>
              f.op === "EQUAL"
                ? d.data[f.field] === f.value
                : d.data[f.field] <= f.value,
            ),
        )
        .slice(0, limit),
    );
  }
  async commit(writes) {
    this.calls++;
    if (
      writes.some((w) => (this.docs.get(w.path)?.version ?? null) !== w.version)
    )
      return false;
    for (const w of writes) this.seed(w.path, w.data);
    return true;
  }
  async account(uid) {
    this.calls++;
    return structuredClone(this.accounts.get(uid) ?? null);
  }
}
function setup() {
  const repo = new Memory();
  repo.seed("config/email", { enabled: true, paused: false });
  repo.seed("config/app", { notificationsEnabled: true });
  repo.seed("families/a", {
    name: "Familia",
    partner1: "Ana",
    partner2: "Luis",
    marriageDate: "2016-11-06",
    partner1BirthDate: "1990-11-06",
    children: [],
    timezone: "America/La_Paz",
  });
  repo.seed("tracking/a", {
    levelId: "l1",
    completedCount: 0,
    totalCompleted: 0,
    finishedCount: 0,
    lastCompletedAt: null,
  });
  repo.seed("journeys/a", { startedAt: now });
  repo.seed("emailPreferences/a", {
    enabled: true,
    challenges: true,
    celebrations: true,
    adminMessages: true,
    hour: 12,
    minute: 0,
    timezone: "America/La_Paz",
    version: 1,
    nextDueAt: new Date(now.getTime() - 60000),
  });
  repo.seed("levels/l1", {
    id: "l1",
    title: "Primero",
    order: 1,
    published: true,
    prerequisiteId: null,
    challenges: [
      { id: "c1", title: "Escucharnos" },
      { id: "c2", title: "Otro reto" },
    ],
  });
  repo.accounts.set("a", {
    email: "family@example.com",
    verified: true,
    disabled: false,
  });
  return repo;
}
function transport() {
  const sent = [];
  return {
    sent,
    fetcher: async (url, options) => {
      assert.equal(String(url), "https://api.resend.com/emails");
      sent.push({ headers: options.headers, body: JSON.parse(options.body) });
      return Response.json({ id: "local-provider-id" });
    },
  };
}
function job(payload, extra = {}) {
  return {
    uid: "a",
    categories: ["challenges"],
    consentVersion: 1,
    payload,
    createdAt: now,
    nextAttemptAt: now,
    terminal: false,
    attempts: 0,
    ...extra,
  };
}

test("missing secrets or disabled sending never calls the mail provider", async () => {
  const repo = setup(),
    t = transport();
  await runCycle(repo, { ...env, SEND_ENABLED: "false" }, now, t.fetcher);
  assert.equal(t.sent.length, 0);
  assert.equal(repo.docs.get("config/email").data.enabled, false);
  await runCycle(repo, { ...env, RESEND_API_KEY: undefined }, now, t.fetcher);
  assert.equal(t.sent.length, 0);
});
test("one daily digest uses the verified Auth address and cannot be duplicated by resetting preferences", async () => {
  const repo = setup(),
    t = transport();
  repo.docs.get("tracking/a").data.email = "untrusted@example.com";
  await runCycle(repo, env, now, t.fetcher);
  assert.equal(t.sent.length, 1);
  assert.deepEqual(t.sent[0].body.to, ["family@example.com"]);
  assert.match(t.sent[0].body.text, /Escucharnos|Feliz aniversario/);
  assert.equal(repo.docs.get("mailRuntime/day-2026-11-06").data.count, 1);
  assert.ok(repo.calls < 49, `Bounded calls: ${repo.calls}`);
  repo.docs.get("emailPreferences/a").data.nextDueAt = new Date(
    now.getTime() - 60000,
  );
  await runCycle(repo, env, now, t.fetcher);
  assert.equal(t.sent.length, 1);
  assert.ok(
    repo.masks.some(
      (m) =>
        m.includes("finishedAt") &&
        !m.includes("answers") &&
        !m.includes("completions"),
    ),
  );
  const stored = [...repo.docs.values()].find((d) =>
    d.path.startsWith("mailJobs/"),
  );
  assert.equal(stored.data.state, "accepted");
  assert.equal(stored.data.payload, undefined);
});
test("global pause, unverified email, disabled account and account deletion suppress mail", async () => {
  for (const condition of ["paused", "unverified", "disabled", "deleted"]) {
    const repo = setup(),
      t = transport();
    if (condition === "paused")
      repo.docs.get("config/email").data.paused = true;
    if (condition === "unverified") repo.accounts.get("a").verified = false;
    if (condition === "disabled") repo.accounts.get("a").disabled = true;
    if (condition === "deleted") repo.seed("accountDeletion/a", {});
    await runCycle(repo, env, now, t.fetcher);
    assert.equal(t.sent.length, 0, condition);
  }
});
test("daily and monthly caps are atomic and conservative under overlapping reservations", async () => {
  const repo = setup(),
    payload = await emailPayload(
      "a",
      "family@example.com",
      { subject: "Test", lines: ["Body"], categories: ["challenges"] },
      env,
      now,
    );
  repo.seed("mailRuntime/day-2026-11-06", { count: 89 });
  const results = await Promise.all([
    reserveJob(repo, "j1", job(payload), now),
    reserveJob(repo, "j2", job(payload), now),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(repo.docs.get("mailRuntime/day-2026-11-06").data.count, 90);
  assert.equal(await reserveJob(repo, "j3", job(payload), now), null);
  repo.seed("mailRuntime/day-2026-11-06", { count: 0 });
  repo.seed("mailRuntime/month-2026-11", { count: 2700 });
  assert.equal(await reserveJob(repo, "j4", job(payload), now), null);
});
test("retry reuses an identical payload and idempotency key; it never retries outside the safe window", async () => {
  const repo = setup(),
    payload = await emailPayload(
      "a",
      "family@example.com",
      { subject: "Test", lines: ["Body"], categories: ["challenges"] },
      env,
      now,
    ),
    reserved = await reserveJob(repo, "stable-key", job(payload), now),
    requests = [];
  await deliverJob(repo, reserved, env, now, async (_, options) => {
    requests.push(options);
    throw new Error("lost response");
  });
  const retry = await repo.get("mailJobs/stable-key"),
    later = new Date(now.getTime() + 16 * 60000);
  await deliverJob(repo, retry, env, later, async (_, options) => {
    requests.push(options);
    return Response.json({ id: "same-provider-id" });
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(
    requests[0].headers["Idempotency-Key"],
    requests[1].headers["Idempotency-Key"],
  );
  const expired = await reserveJob(repo, "ambiguous-old", job(payload), now),
    t = transport();
  await deliverJob(
    repo,
    expired,
    env,
    new Date(now.getTime() + 23 * 3600000),
    t.fetcher,
  );
  assert.equal(t.sent.length, 0);
  assert.equal(
    repo.docs.get("mailJobs/ambiguous-old").data.state,
    "review_required",
  );
});
test("withdrawing consent or changing the verified address cancels an already reserved email", async () => {
  for (const reason of ["consent", "version", "address"]) {
    const repo = setup(),
      payload = await emailPayload(
        "a",
        "family@example.com",
        { subject: "Test", lines: ["Body"], categories: ["challenges"] },
        env,
        now,
      ),
      reserved = await reserveJob(repo, "x", job(payload), now),
      t = transport();
    if (reason === "consent")
      repo.docs.get("emailPreferences/a").data.enabled = false;
    if (reason === "version")
      repo.docs.get("emailPreferences/a").data.version++;
    if (reason === "address")
      repo.accounts.get("a").email = "changed@example.com";
    await deliverJob(repo, reserved, env, now, t.fetcher);
    assert.equal(t.sent.length, 0);
    assert.equal(repo.docs.get("mailJobs/x").data.state, "suppressed");
  }
});
test("completing a pending challenge before a retry prevents a stale reminder", async () => {
  const repo = setup(),
    t = transport();
  await runCycle(repo, env, now, async () => {
    throw new Error("local lost response");
  });
  const pending = [...repo.docs.values()].find((d) =>
    d.path.startsWith("mailJobs/"),
  );
  assert.ok(pending);
  repo.docs.get("tracking/a").data.totalCompleted = 1;
  await deliverJob(
    repo,
    pending,
    env,
    new Date(now.getTime() + 16 * 60000),
    t.fetcher,
  );
  assert.equal(t.sent.length, 0);
  assert.equal(repo.docs.get(pending.path).data.state, "suppressed");
});
test("administrator email obeys the target consent, current admin role and fixed recipient", async () => {
  for (const allowed of [true, false]) {
    const repo = setup(),
      t = transport();
    repo.docs.get("emailPreferences/a").data.nextDueAt = new Date(
      now.getTime() + 86400000,
    );
    repo.seed("roles/admin", { role: allowed ? "admin" : "member" });
    repo.seed("emailQueue/message", {
      uid: "a",
      senderUid: "admin",
      title: "Hola <script>",
      body: "Buen día & ánimo",
      createdAt: now,
      state: "pending",
      to: "attacker@example.com",
    });
    await runCycle(repo, env, new Date(now.getTime() + 10 * 60000), t.fetcher);
    assert.equal(t.sent.length, allowed ? 1 : 0);
    if (allowed) {
      assert.deepEqual(t.sent[0].body.to, ["family@example.com"]);
      assert.doesNotMatch(t.sent[0].body.html, /<script>/);
      assert.match(t.sent[0].body.html, /&lt;script&gt;/);
    }
  }
});
test("unsubscribe GET is safe for scanners, POST opts out, and forged or expired links cannot change preferences", async () => {
  const repo = setup(),
    token = await unsubscribeToken(
      "a",
      now.getTime() + 86400000,
      env.UNSUBSCRIBE_SECRET,
    ),
    url = `${env.PUBLIC_BASE_URL}/unsubscribe?uid=a&token=${token}`;
  assert.equal(
    (await unsubscribe(new Request(url), env, repo, now)).status,
    200,
  );
  assert.equal(repo.docs.get("emailPreferences/a").data.enabled, true);
  assert.equal(
    (await unsubscribe(new Request(url, { method: "POST" }), env, repo, now))
      .status,
    200,
  );
  assert.equal(repo.docs.get("emailPreferences/a").data.enabled, false);
  assert.equal(repo.docs.get("emailPreferences/a").data.adminMessages, false);
  assert.equal(
    (
      await unsubscribe(
        new Request(url.replace("uid=a", "uid=b"), { method: "POST" }),
        env,
        repo,
        now,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await unsubscribe(
        new Request(url, { method: "POST" }),
        env,
        repo,
        new Date(now.getTime() + 2 * 86400000),
      )
    ).status,
    400,
  );
});
test("bad timezone or interrupted deletion cannot leave a permanently blocking due subscriber", async () => {
  for (const kind of ["zone", "deleted"]) {
    const repo = setup(),
      t = transport();
    if (kind === "zone")
      repo.docs.get("emailPreferences/a").data.timezone = "not/a-zone";
    else repo.seed("accountDeletion/a", {});
    await runCycle(repo, env, now, t.fetcher);
    assert.equal(t.sent.length, 0);
    assert.equal(repo.docs.get("emailPreferences/a").data.enabled, false);
  }
});
test("Firestore conversion preserves dates and the transport scopes requests to the configured project", async () => {
  const data = { at: now, n: 3, list: [true, "a"], map: { empty: null } };
  assert.deepEqual(fromValue(toValue(data)), data);
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const pkcs8 = Buffer.from(
      await crypto.subtle.exportKey("pkcs8", keys.privateKey),
    ).toString("base64"),
    sa = {
      project_id: "demo-entre-dos",
      client_email: "local-test@example.iam.gserviceaccount.com",
      private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----`,
    };
  const repo = await googleRepository(
    { ...env, GOOGLE_SERVICE_ACCOUNT: JSON.stringify(sa) },
    async (url, options) => {
      const address = String(url);
      if (address === "https://oauth2.googleapis.com/token") {
        const assertion = options.body.get("assertion"),
          segments = assertion.split(".");
        assert.equal(
          await crypto.subtle.verify(
            "RSASSA-PKCS1-v1_5",
            keys.publicKey,
            Buffer.from(segments[2], "base64url"),
            new TextEncoder().encode(segments.slice(0, 2).join(".")),
          ),
          true,
        );
        return Response.json({ access_token: "local-only" });
      }
      assert.match(address, /projects\/demo-entre-dos/);
      assert.equal(options.headers.Authorization, "Bearer local-only");
      if (address.endsWith(":commit")) {
        const body = JSON.parse(options.body);
        assert.equal(body.writes[0].currentDocument.updateTime, "old-version");
        assert.ok(body.writes[0].update.fields.at.timestampValue);
        return Response.json({});
      }
      if (address.includes("identitytoolkit"))
        return Response.json({
          users: [{ email: "local@example.com", emailVerified: true }],
        });
      assert.match(address, /mask.fieldPaths=finishedAt/);
      return Response.json({
        name: "projects/demo-entre-dos/databases/(default)/documents/families/a/progress/l1",
        fields: { finishedAt: { stringValue: "yes" } },
        updateTime: "current-version",
      });
    },
  );
  assert.equal(
    (await repo.get("families/a/progress/l1", ["finishedAt"])).data.finishedAt,
    "yes",
  );
  assert.equal(
    await repo.commit([
      { path: "mailJobs/x", version: "old-version", data: { at: now } },
    ]),
    true,
  );
  assert.equal((await repo.account("a")).verified, true);
});
test("public HTTP health does not send or expose secrets", async () => {
  const result = await worker.fetch(new Request("https://local.test/"), {
    ...env,
    SEND_ENABLED: "false",
  });
  assert.equal((await result.json()).sending, false);
});

test("runtime settings customize sender, reply-to, templates and limits while Gmail cannot replace a verified sender", async () => {
  const repo = setup(),
    t = transport();
  Object.assign(repo.docs.get("config/email").data, {
    fromName: "Hogar y Familia",
    fromEmail: "avisos@example.com",
    replyTo: "sevenawesome.srl@gmail.com",
    birthdayTemplate: "Celebramos a {person}",
    subjectPrefix: "Nuestra comunidad",
    dailyLimit: 1,
  });
  await runCycle(repo, env, now, t.fetcher);
  assert.equal(t.sent.length, 1);
  assert.equal(t.sent[0].body.from, "Hogar y Familia <avisos@example.com>");
  assert.equal(t.sent[0].body.reply_to, "sevenawesome.srl@gmail.com");
  assert.match(t.sent[0].body.subject, /Nuestra comunidad/);
  assert.match(t.sent[0].body.text, /Celebramos a Ana/);
  const payload = t.sent[0].body;
  assert.equal(
    await reserveJob(repo, "over-custom-limit", job(payload), now),
    null,
  );
  const wrong = setup(),
    blocked = transport();
  wrong.docs.get("config/email").data.fromEmail = "sevenawesome.srl@gmail.com";
  await runCycle(wrong, env, now, blocked.fetcher);
  assert.equal(blocked.sent.length, 0);
  assert.equal(wrong.docs.get("config/email").data.enabled, false);
});
test("queued mail is suppressed if a granular send permission was revoked", async () => {
  const repo = setup(),
    t = transport();
  repo.docs.get("emailPreferences/a").data.nextDueAt = new Date(
    now.getTime() + 86400000,
  );
  repo.seed("roles/admin", { role: "admin", permissions: ["families.view"] });
  repo.seed("emailQueue/revoked", {
    uid: "a",
    senderUid: "admin",
    title: "Hola",
    body: "Mensaje",
    createdAt: now,
    state: "pending",
  });
  await runCycle(repo, env, new Date(now.getTime() + 10 * 60000), t.fetcher);
  assert.equal(t.sent.length, 0);
  assert.equal(repo.docs.get("emailQueue/revoked").data.state, "suppressed");
});
