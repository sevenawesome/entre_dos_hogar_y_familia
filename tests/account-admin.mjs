import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleAccountsRequest,
  previewDeletion,
  confirmDeletion,
  stepDeletionJob,
  deletionCycle,
  verifyFirebaseToken,
  accountsRepository,
} from "../.cache/email-worker/index.js";
const now = new Date("2026-11-10T20:00:00Z"),
  seconds = now.getTime() / 1000;
const env = {
  FIREBASE_PROJECT_ID: "demo-entre-dos",
  ADMIN_ACCOUNTS_ENABLED: "true",
};
const claims = (uid = "owner", extra = {}) => ({
  sub: uid,
  auth_time: seconds - 20,
  email_verified: true,
  iat: seconds - 10,
  exp: seconds + 3000,
  aud: env.FIREBASE_PROJECT_ID,
  iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
  ...extra,
});
class Memory {
  async canDeleteAccounts() {
    return !this.denyAuth;
  }
  docs = new Map();
  accounts = new Map();
  revision = 0;
  deleted = [];
  masks = [];
  events = [];
  denyAuth = false;
  failRemove = false;
  promoteOnMarker = false;
  seed(path, data) {
    this.docs.set(path, {
      path,
      data: structuredClone(data),
      version: String(++this.revision),
    });
  }
  async get(path, mask) {
    if (mask) this.masks.push({ path, mask });
    return structuredClone(this.docs.get(path) ?? null);
  }
  async query(collection, filters, limit, mask) {
    if (mask) this.masks.push({ path: collection, mask });
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
    if (
      writes.some((w) => (this.docs.get(w.path)?.version ?? null) !== w.version)
    )
      return false;
    for (const w of writes) {
      this.seed(w.path, w.data);
      if (this.promoteOnMarker && w.path === "accountDeletion/a")
        this.seed("roles/a", { role: "admin" });
    }
    return true;
  }
  async account(uid) {
    return this.accountInfo(uid);
  }
  async accountInfo(uid) {
    return structuredClone(this.accounts.get(uid) ?? null);
  }
  async listAccounts(cursor = "0", size = 10) {
    const all = [...this.accounts.values()],
      at = Number(cursor || 0);
    return {
      accounts: structuredClone(all.slice(at, at + size)),
      cursor: at + size < all.length ? String(at + size) : null,
    };
  }
  async deleteAuth(uid) {
    this.events.push("auth:" + uid);
    if (this.denyAuth) throw Error("denied");
    this.accounts.delete(uid);
    this.deleted.push(uid);
  }
  async removeDocuments(paths) {
    this.events.push("data");
    if (this.failRemove) {
      this.failRemove = false;
      throw Error("temporary");
    }
    if (
      paths.some(
        (p) => p.version && this.docs.get(p.path)?.version !== p.version,
      )
    )
      return false;
    for (const p of paths) this.docs.delete(p.path);
    return true;
  }
}
function setup() {
  const r = new Memory();
  for (const uid of ["owner", "admin", "a", "b"]) {
    r.accounts.set(uid, {
      uid,
      email: `${uid}@example.com`,
      verified: true,
      disabled: false,
      validSince: 0,
    });
    r.seed(`families/${uid}`, {
      name: `Familia ${uid}`,
      private: "never-return",
    });
    r.seed(`tracking/${uid}`, { levelId: "l1" });
  }
  r.seed("roles/owner", { role: "owner" });
  r.seed("roles/admin", { role: "admin" });
  r.seed("roles/b", { role: "member" });
  r.seed("config/app", { keep: true });
  r.seed("levels/l1", { keep: true });
  return r;
}
function request(
  path = "",
  body,
  token = "owner",
  method = body === undefined ? "GET" : "POST",
) {
  return new Request("https://service.test/admin/accounts" + path, {
    method,
    headers: token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : {},
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const verify = async (token) => claims(token);
const call = (repo, path = "", body, token = "owner", verifier = verify) =>
  handleAccountsRequest(request(path, body, token), env, repo, verifier, now);
async function queued(repo, scope = "one", uid = "a") {
  const p = await previewDeletion(repo, "owner", { scope, uid }, now);
  await confirmDeletion(repo, p.job.id, "owner", p.job.confirmation, now);
  return p;
}

test("account management rejects anonymous, ordinary admins, disabled or unverified owners and revoked tokens", async () => {
  for (const [token, extra, code] of [
    [null, {}, 401],
    ["admin", {}, 403],
    ["a", {}, 403],
    ["owner", { email_verified: false }, 403],
  ]) {
    const r = setup();
    const result = await call(r, "", undefined, token, async (t) =>
      claims(t, extra),
    );
    assert.equal(result.status, code);
    assert.equal(r.deleted.length, 0);
  }
  for (const change of [
    { disabled: true },
    { verified: false },
    { validSince: seconds + 1 },
  ]) {
    const r = setup();
    Object.assign(r.accounts.get("owner"), change);
    assert.equal((await call(r)).status, 403);
  }
  assert.equal(
    (
      await call(setup(), "", undefined, "forged", async () => {
        throw Error("bad signature");
      })
    ).status,
    401,
  );
});
test("owner listing includes incomplete accounts, marks protected roles and returns no private family fields", async () => {
  const r = setup();
  r.docs.delete("families/b");
  const response = await call(r),
    data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(
    data.rows.find((x) => x.uid === "b").name,
    "Sin perfil familiar",
  );
  assert.equal(data.rows.find((x) => x.uid === "owner").protected, true);
  assert.equal(data.rows.find((x) => x.uid === "admin").protected, true);
  assert.equal(data.rows.find((x) => x.uid === "a").protected, false);
  assert.ok(!JSON.stringify(data).includes("never-return"));
  assert.ok(
    r.masks
      .filter((x) => x.path.startsWith("families/"))
      .every((x) => x.mask.join() === "name"),
  );
});

test("missing server deletion permission cannot create or confirm a deletion plan", async () => {
  const r = setup();
  r.denyAuth = true;
  const failed = await call(r, "/preview", { scope: "all" });
  assert.equal(failed.status, 503);
  assert.equal(
    [...r.docs.keys()].filter((p) => p.startsWith("adminDeletionJobs/")).length,
    0,
  );
  r.denyAuth = false;
  const p = await previewDeletion(r, "owner", { scope: "one", uid: "a" }, now);
  r.denyAuth = true;
  assert.equal(
    (
      await call(r, `/jobs/${p.job.id}/confirm`, {
        confirmation: p.job.confirmation,
      })
    ).status,
    503,
  );
  assert.equal(r.deleted.length, 0);
});
test("previews freeze existing family accounts, retain administrative accounts and never delete", async () => {
  const r = setup(),
    p = await previewDeletion(r, "owner", { scope: "all" }, now);
  assert.equal(p.job.total, 2);
  assert.equal(p.protectedCount, 2);
  assert.equal(p.job.confirmation, "ELIMINAR 2 CUENTAS");
  assert.deepEqual(r.docs.get(`adminDeletionJobs/${p.job.id}`).data.targets, [
    "a",
    "b",
  ]);
  assert.equal(r.deleted.length, 0);
  await assert.rejects(
    previewDeletion(r, "owner", { scope: "one", uid: "owner" }, now),
  );
  await assert.rejects(
    previewDeletion(r, "owner", { scope: "one", uid: "admin" }, now),
  );
  assert.ok(!JSON.stringify(p).includes("never-return"));
});
test("wrong, expired or stale-session confirmations cannot queue destruction", async () => {
  const r = setup(),
    p = await previewDeletion(r, "owner", { scope: "one", uid: "a" }, now);
  await assert.rejects(
    confirmDeletion(r, p.job.id, "owner", "ELIMINAR TODO", now),
  );
  await assert.rejects(
    confirmDeletion(
      r,
      p.job.id,
      "owner",
      p.job.confirmation,
      new Date(now.getTime() + 16 * 60000),
    ),
  );
  const result = await call(
    r,
    `/jobs/${p.job.id}/confirm`,
    { confirmation: p.job.confirmation },
    "owner",
    async () => claims("owner", { auth_time: seconds - 301 }),
  );
  assert.equal(result.status, 401);
  assert.equal((await stepDeletionJob(r, p.job.id, now)).state, "preview");
  assert.equal(r.deleted.length, 0);
});
test("confirmed cleanup removes Auth and all known private/shared data, preserving app content and later signups", async () => {
  const r = setup();
  for (const root of [
    "avatars",
    "portraits",
    "journeys",
    "familyControls",
    "emailPreferences",
    "community",
  ])
    r.seed(`${root}/a`, { private: "secret" });
  for (const c of ["progress", "devices", "inbox"])
    r.seed(`families/a/${c}/one`, { private: "secret" });
  for (const c of ["emailQueue", "mailJobs", "mailEvents"]) {
    r.seed(`${c}/a`, { uid: "a", private: "secret" });
    r.seed(`${c}/keep`, { uid: "owner" });
  }
  const p = await queued(r, "all");
  r.accounts.set("later", { uid: "later", email: "later@example.com" });
  const first = await stepDeletionJob(r, p.job.id, now);
  assert.equal(first.deleted, 1);
  assert.equal(r.accounts.has("a"), false);
  assert.ok(r.docs.has("accountDeletion/a"));
  assert.ok(
    ![...r.docs.keys()].some(
      (x) => x === "families/a" || x.startsWith("families/a/"),
    ),
  );
  assert.ok(!r.docs.has("portraits/a"));
  assert.ok(r.docs.has("mailJobs/keep"));
  const last = await stepDeletionJob(r, p.job.id, now);
  assert.equal(last.state, "complete");
  assert.equal(last.deleted, 2);
  assert.ok(
    r.accounts.has("owner") &&
      r.accounts.has("admin") &&
      r.accounts.has("later"),
  );
  assert.ok(r.docs.has("config/app") && r.docs.has("levels/l1"));
  assert.equal(r.events[0], "auth:a");
  assert.ok(
    r.masks
      .filter((x) => x.path.includes("/progress"))
      .every((x) => x.mask.join() === "__name__"),
  );
  assert.ok(
    !JSON.stringify(
      [...r.docs.values()].filter((d) => d.path.startsWith("adminAudit/")),
    ).includes("secret"),
  );
});
test("individual and bulk cleanup remove family, parent and child photos including community copies", async () => {
  for (const scope of ["one", "all"]) {
    const r = setup();
    const image = "data:image/jpeg;base64,private-family-photo";
    for (const uid of ["owner", "admin", "a", "b"]) {
      r.seed(`avatars/${uid}`, { dataUri: image });
      r.seed(`portraits/${uid}`, {
        people: {
          partner1: { dataUri: image },
          partner2: { dataUri: image },
          child1: { dataUri: image },
        },
        publicPeople: [{ key: "child1", dataUri: image }],
      });
      r.seed(`community/${uid}`, {
        visible: true,
        avatar: image,
        people: [{ key: "child1", dataUri: image }],
      });
      r.seed(`families/${uid}/progress/l1`, {
        completions: [{ note: "private note" }],
        questionnaire: { answer: "private answer" },
      });
    }
    const p = await queued(r, scope);
    let result;
    do {
      result = await stepDeletionJob(r, p.job.id, now);
    } while (result.state === "queued");
    assert.equal(result.state, "complete");
    const removed = scope === "one" ? ["a"] : ["a", "b"];
    for (const uid of ["owner", "admin", "a", "b"]) {
      for (const root of ["avatars", "portraits", "community"])
        assert.equal(
          r.docs.has(`${root}/${uid}`),
          !removed.includes(uid),
          `${scope}: ${root}/${uid}`,
        );
      assert.equal(
        r.docs.has(`families/${uid}/progress/l1`),
        !removed.includes(uid),
      );
      assert.equal(r.accounts.has(uid), !removed.includes(uid));
    }
    const retainedJobData = [...r.docs.values()].filter(
      (d) =>
        d.path.startsWith("adminAudit/") ||
        d.path.startsWith("adminDeletionJobs/") ||
        d.path.startsWith("accountDeletion/"),
    );
    assert.ok(!JSON.stringify(retainedJobData).includes(image));
    assert.ok(!JSON.stringify(retainedJobData).includes("private note"));
    assert.ok(!JSON.stringify(retainedJobData).includes("private answer"));
  }
});

test("duplicate confirmations and concurrent steps delete a target once", async () => {
  const r = setup(),
    p = await queued(r);
  await confirmDeletion(r, p.job.id, "owner", p.job.confirmation, now);
  await Promise.all([
    stepDeletionJob(r, p.job.id, now),
    stepDeletionJob(r, p.job.id, now),
  ]);
  assert.deepEqual(r.deleted, ["a"]);
  assert.equal(r.docs.get(`adminDeletionJobs/${p.job.id}`).data.index, 1);
  assert.equal(
    [...r.docs.keys()].filter((x) => x === `adminAudit/${p.job.id}-requested`)
      .length,
    1,
  );
});
test("a role promotion after preview, including a race while marking, protects that account", async () => {
  for (const race of [false, true]) {
    const r = setup(),
      p = await queued(r);
    if (race) r.promoteOnMarker = true;
    else r.seed("roles/a", { role: "admin" });
    const result = await stepDeletionJob(r, p.job.id, now);
    assert.equal(result.skipped, 1);
    assert.equal(result.deleted, 0);
    assert.equal(r.accounts.has("a"), true);
    assert.equal(r.docs.has("accountDeletion/a"), false);
    assert.equal(r.deleted.length, 0);
  }
});
test("Auth permission failure preserves Firestore data and can be resumed", async () => {
  const r = setup(),
    p = await queued(r);
  r.denyAuth = true;
  const result = await stepDeletionJob(r, p.job.id, now);
  assert.equal(result.processed, 0);
  assert.ok(result.error);
  assert.ok(r.docs.has("families/a"));
  assert.ok(r.accounts.has("a"));
  r.denyAuth = false;
  assert.equal((await stepDeletionJob(r, p.job.id, now)).state, "complete");
});
test("cleanup resumes after an interruption following Auth deletion", async () => {
  const r = setup(),
    p = await queued(r);
  r.failRemove = true;
  const first = await stepDeletionJob(r, p.job.id, now);
  assert.ok(first.error);
  assert.equal(r.accounts.has("a"), false);
  assert.ok(r.docs.has("families/a"));
  const last = await stepDeletionJob(r, p.job.id, now);
  assert.equal(last.state, "complete");
  assert.equal(last.deleted, 1);
  assert.equal(r.docs.has("families/a"), false);
});
test("large subcollections are purged in bounded pages without skipping records", async () => {
  const r = setup();
  for (let i = 0; i < 61; i++)
    r.seed(`families/a/progress/l${i}`, { note: "private" });
  const p = await queued(r);
  assert.equal((await stepDeletionJob(r, p.job.id, now)).processed, 0);
  assert.equal((await stepDeletionJob(r, p.job.id, now)).processed, 0);
  assert.equal((await stepDeletionJob(r, p.job.id, now)).state, "complete");
  assert.equal(
    [...r.docs.keys()].filter((x) => x.startsWith("families/a/progress/"))
      .length,
    0,
  );
});
test("owner revocation blocks queued work and preview jobs never run in the cron", async () => {
  const r = setup(),
    p = await queued(r);
  r.seed("roles/owner", { role: "member" });
  assert.equal((await stepDeletionJob(r, p.job.id, now)).state, "blocked");
  assert.equal(r.deleted.length, 0);
  const clean = setup();
  await previewDeletion(clean, "owner", { scope: "all" }, now);
  await deletionCycle(clean, env, now);
  assert.equal(clean.deleted.length, 0);
  const q = await queued(clean);
  await deletionCycle(clean, { ...env, ADMIN_ACCOUNTS_ENABLED: "false" }, now);
  assert.equal(clean.deleted.length, 0);
  await deletionCycle(clean, env, now);
  assert.equal(clean.accounts.has("a"), false);
  assert.equal(
    clean.docs.get(`adminDeletionJobs/${q.job.id}`).data.state,
    "complete",
  );
});
test("job status and actions cannot be used by a different account", async () => {
  const r = setup(),
    p = await queued(r);
  assert.equal(
    (await call(r, `/jobs/${p.job.id}`, undefined, "admin")).status,
    403,
  );
  assert.equal((await call(r, `/jobs/${p.job.id}/step`, {}, "a")).status, 403);
  assert.equal(r.deleted.length, 0);
  assert.equal(
    (await call(r, "/preview", { scope: "one", uid: "../../owner" })).status,
    400,
  );
});

test("Firebase JWT verification checks signature, project, expiry, algorithm and malformed tokens", async () => {
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
  const publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
  publicKey.kid = "local-firebase-test";
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  async function jwt(
    payload = claims(),
    header = { alg: "RS256", kid: publicKey.kid },
  ) {
    const unsigned = encode(header) + "." + encode(payload),
      signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        keys.privateKey,
        new TextEncoder().encode(unsigned),
      );
    return unsigned + "." + Buffer.from(signature).toString("base64url");
  }
  const fetcher = async (url) => {
    assert.equal(
      String(url),
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    );
    return Response.json(
      { keys: [publicKey] },
      { headers: { "cache-control": "max-age=3600" } },
    );
  };
  assert.equal(
    (
      await verifyFirebaseToken(
        await jwt(),
        env.FIREBASE_PROJECT_ID,
        now,
        fetcher,
      )
    ).sub,
    "owner",
  );
  for (const payload of [
    claims("owner", { aud: "other-project" }),
    claims("owner", { iss: "evil" }),
    claims("owner", { exp: seconds }),
    claims("owner", { iat: seconds + 1 }),
    claims("owner", { auth_time: seconds + 1 }),
    claims("bad/path"),
  ])
    await assert.rejects(
      verifyFirebaseToken(
        await jwt(payload),
        env.FIREBASE_PROJECT_ID,
        now,
        fetcher,
      ),
    );
  await assert.rejects(
    verifyFirebaseToken(
      await jwt(claims(), { alg: "none", kid: publicKey.kid }),
      env.FIREBASE_PROJECT_ID,
      now,
      fetcher,
    ),
  );
  const good = await jwt(),
    parts = good.split(".");
  parts[1] = encode(claims("attacker"));
  await assert.rejects(
    verifyFirebaseToken(parts.join("."), env.FIREBASE_PROJECT_ID, now, fetcher),
  );
  await assert.rejects(
    verifyFirebaseToken("not-a-jwt", env.FIREBASE_PROJECT_ID, now, fetcher),
  );
});

test("Google account transport scopes deletion to its project and requests no hashes or private family fields", async () => {
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
  ).toString("base64");
  const calls = [];
  const repo = await accountsRepository(
    {
      ...env,
      GOOGLE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: env.FIREBASE_PROJECT_ID,
        client_email: "account-tests@example.iam.gserviceaccount.com",
        private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----`,
      }),
    },
    async (url, options) => {
      const address = String(url);
      if (address === "https://oauth2.googleapis.com/token")
        return Response.json({ access_token: "test-only" });
      calls.push({
        url: address,
        body: options.body && JSON.parse(options.body),
      });
      assert.ok(address.includes("projects/demo-entre-dos/"));
      assert.equal(options.headers.Authorization, "Bearer test-only");
      if (address.includes(":batchGet") || address.includes(":lookup")) {
        assert.ok(
          new URL(address).searchParams.get("fields").includes("validSince"),
        );
        assert.ok(
          !new URL(address).searchParams.get("fields").includes("password"),
        );
        return Response.json({
          users: [
            {
              localId: "a",
              email: "a@example.com",
              emailVerified: true,
              validSince: "50",
            },
          ],
        });
      }
      return Response.json({});
    },
  );
  assert.equal((await repo.listAccounts("page", 10)).accounts[0].uid, "a");
  assert.equal((await repo.accountInfo("a")).validSince, 50);
  await repo.deleteAuth("a");
  await repo.removeDocuments([{ path: "families/a/progress/l1" }]);
  assert.deepEqual(calls.find((c) => c.url.endsWith(":delete")).body, {
    localId: "a",
  });
  assert.equal(
    calls.find((c) => c.url.endsWith(":commit")).body.writes[0].delete,
    "projects/demo-entre-dos/databases/(default)/documents/families/a/progress/l1",
  );
});
