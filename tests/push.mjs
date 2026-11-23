import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { pushCycle, pushDeviceRequest, requestOwnDeletion } from "../.cache/email-worker/index.js";
import { SafetyRepository } from "./helpers/safety-repository.mjs";
const now = new Date("2026-11-23T18:00:00Z");
const env = { FIREBASE_PROJECT_ID: "demo-entre-dos", PUSH_ENABLED: "true" };
const token = "ExponentPushToken[test-token-1234567890]";
const req = input => new Request("https://service.test/notifications/device", { method: "POST", headers: { Authorization: "Bearer mock" }, body: JSON.stringify({platform:"ios",...input}) });
const verify = uid => async () => ({ sub: uid, auth_time: 1 });
async function setup() {
  const repo = new SafetyRepository().member("a").member("admin", "admin");
  const response = await pushDeviceRequest(req({ token, deviceId: "phone-a", enabled: true }), env, repo, now, verify("a"));
  assert.equal(response.status, 200);
  repo.seed("families/a/inbox/msg", { title: "Private title", body: "PRIVATE BODY", senderUid: "admin", createdAt: now, attachments: [{ base64: "SECRET" }], pushState: "pending" });
  return repo;
}
const sent = async () => Response.json({ data: [{ status: "ok", id: "ticket-1" }] });
test("registering a device uses authenticated account, owns tokens uniquely, and ignores stale sign-out", async () => {
  const repo = await setup(); repo.member("b");
  const input = { token, deviceId: "phone-b", enabled: true, uid: "attacker" };
  await pushDeviceRequest(req(input), env, repo, now, verify("b"));
  await pushDeviceRequest(req({ ...input, enabled: false }), env, repo, now, verify("a"));
  const rows = await repo.query("pushTokens", [], 5);
  assert.equal(rows.length, 1); assert.equal(rows[0].data.uid, "b"); assert.equal(rows[0].data.enabled, true);
  await pushDeviceRequest(req({ ...input, enabled: false }), env, repo, now, verify("b"));
  assert.equal((await repo.get(rows[0].path)).data.enabled, false);
});
test("device registration rejects unauthenticated, deleted and suspended accounts and malformed tokens", async () => {
  const repo = await setup();
  assert.equal((await worker.fetch(new Request("https://s.test/notifications/device", { method: "POST" }), env)).status, 401);
  assert.equal((await pushDeviceRequest(req({ token: "fake", deviceId: "p", enabled: true }), env, repo, now, verify("a"))).status, 400);
  repo.seed("accountDeletion/a", { requestedAt: now });
  assert.equal((await pushDeviceRequest(req({ token, deviceId: "p", enabled: true }), env, repo, now, verify("a"))).status, 403);
  repo.docs.delete("accountDeletion/a"); repo.seed("accountSuspensions/a", { state: "suspended" });
  assert.equal((await pushDeviceRequest(req({ token, deviceId: "p", enabled: true }), env, repo, now, verify("a"))).status, 403);
});
test("remote dispatch preserves private inbox data, sends only generic text and deep links to the right account", async () => {
  const repo = await setup(); let payload;
  await pushCycle(repo, env, async (_url, options) => { payload = JSON.parse(options.body); return sent(); }, now);
  const message = (await repo.get("families/a/inbox/msg")).data;
  assert.equal(message.pushState, "accepted"); assert.equal(message.body, "PRIVATE BODY"); assert.equal(message.attachments[0].base64, "SECRET");
  assert.ok(!JSON.stringify(payload).includes("PRIVATE")); assert.equal(payload[0].data.accountUid, "a"); assert.equal(payload[0].data.screen, "inbox");
  await pushCycle(repo, env, async () => { throw Error("must not resend"); }, now);
  assert.equal((await repo.get("families/a/inbox/msg")).data.pushState, "accepted");
});
test("simultaneous senders claim a notification once", async () => {
  const repo = await setup(); let sends = 0;
  await Promise.all([1, 2].map(() => pushCycle(repo, env, async () => { sends++; return sent(); }, now)));
  assert.equal(sends, 1);
});
test("disabled service, expired devices, paused notices and removed accounts cannot receive pushes", async () => {
  const disabled = await setup(); await pushCycle(disabled, { ...env, PUSH_ENABLED: "false" }, () => { throw Error("must not send"); }, now);
  assert.equal((await disabled.get("families/a/inbox/msg")).data.pushState, "pending");
  for (const [path, data] of [["familyControls/a", { remindersPaused: true }], ["config/app", { notificationsEnabled: false }], ["accountDeletion/a", {}], ["accountSuspensions/a", {}], ["accountDeletion/admin", {}]]) {
    const repo = await setup(); repo.seed(path, data);
    await pushCycle(repo, env, () => { throw Error("must not send"); }, now);
    assert.equal((await repo.get("families/a/inbox/msg")).data.pushState, "skipped", path);
  }
  const repo = await setup(); const device = (await repo.query("pushTokens", [], 5))[0]; repo.seed(device.path, { ...device.data, expiresAt: new Date(+now - 1) });
  await pushCycle(repo, env, () => { throw Error("expired"); }, now);
  assert.equal((await repo.get("families/a/inbox/msg")).data.pushState, "skipped");
});
test("receipts retire invalid tokens, preserve another account's registration and don't call accepted delivery received", async () => {
  for (const reassigned of [false, true]) {
    const repo = await setup(); await pushCycle(repo, env, sent, now);
    const device = (await repo.query("pushTokens", [], 5))[0];
    if (reassigned) repo.seed(device.path, { ...device.data, uid: "b" });
    await pushCycle(repo, env, async () => Response.json({ data: { "ticket-1": { status: "error", details: { error: "DeviceNotRegistered" } } } }), new Date(+now + 60000));
    assert.equal((await repo.get(device.path)).data.enabled, reassigned);
    assert.equal((await repo.get("families/a/inbox/msg")).data.pushState, "failed");
  }
  const repo = await setup(); await pushCycle(repo, env, sent, now);
  await pushCycle(repo, env, async () => Response.json({ data: { "ticket-1": { status: "ok" } } }), new Date(+now + 60000));
  assert.equal((await repo.get("families/a/inbox/msg")).data.pushState, "sent");
});
test("uncertain network errors never blindly resend and permanent deletion removes device registrations", async () => {
  const repo = await setup(); let sends = 0;
  const failure = async () => { sends++; throw Error("timeout"); };
  await pushCycle(repo, env, failure, now); await pushCycle(repo, env, failure, now); assert.equal(sends, 1);
  await requestOwnDeletion(repo, "a", { confirmation: "ELIMINAR MI CUENTA" }, now);
  assert.equal((await repo.query("pushTokens", [], 5)).length, 0);
});
test("unconfigured Android is not advertised as active, and worst-case push work fits Free's 50 subrequests", async () => {
  const repo = await setup();
  assert.equal((await (await pushDeviceRequest(req({ token, deviceId: "android-phone", enabled: true, platform: "android" }), env, repo, now, verify("a"))).json()).enabled, false);
  for (const uid of ["a", "b", "c", "d"]) {
    repo.member(uid); const tickets = [];
    for (let i = 0; i < 5; i++) {
      const path = `pushTokens/${uid}-${i}`;
      repo.seed(path, { uid, enabled: true, platform: "ios", deviceId: `${uid}-${i}`, token: `ExponentPushToken[${uid}-test-token-1234567890-${i}]`, expiresAt: new Date(+now + 86400000) });
      tickets.push({ path, deviceId: `${uid}-${i}`, id: `${uid}-${i}` });
    }
    repo.seed(`families/${uid}/inbox/test`, { senderUid: "admin", createdAt: now, pushState: ["b", "c"].includes(uid) ? "accepted" : "pending", pushTickets: tickets, pushAttemptedAt: new Date(+now - 60000) });
  }
  repo.docs.delete("families/a/inbox/msg");
  for (let i = 0; i < 2; i++) repo.seed(`families/a/inbox/stale-${i}`, { pushState: "sending", pushAttemptedAt: new Date(+now - 700000) });
  let count = 1; // Include Google's OAuth exchange, even when production's token cache is cold.
  for (const name of ["get", "query", "commit", "accountInfo"]) { const original = repo[name].bind(repo); repo[name] = async (...args) => { count++; return original(...args); }; }
  await pushCycle(repo, env, async (url, options) => {
    count++;
    if (String(url).endsWith("getReceipts")) return Response.json({ data: Object.fromEntries(JSON.parse(options.body).ids.map(id => [id, { status: "error", details: { error: "DeviceNotRegistered" } }])) });
    return Response.json({ data: JSON.parse(options.body).map(() => ({ status: "error", details: { error: "DeviceNotRegistered" } })) });
  }, now);
  assert.ok(count <= 50, `Used ${count} external subrequests`);
  assert.equal((await repo.get("families/a/inbox/test")).data.pushState, "failed");
  assert.equal((await repo.get("families/d/inbox/test")).data.pushState, "failed");
});
