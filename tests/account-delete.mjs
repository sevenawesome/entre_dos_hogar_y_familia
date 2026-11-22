import { test } from "node:test";
import assert from "node:assert/strict";
import { requestOwnDeletion, ownDeletionCycle, selfDeletionRequest, previewDeletion, sendAnniversaryGreeting, setCommunityBlock, reportCommunityContent } from "../.cache/email-worker/index.js";
import { SafetyRepository } from "./helpers/safety-repository.mjs";
const now = new Date("2026-11-10T20:00:00Z"), seconds = now.getTime() / 1000;
const phrase = { confirmation: "ELIMINAR MI CUENTA" };
const env = { FIREBASE_PROJECT_ID: "demo-entre-dos", ADMIN_ACCOUNTS_ENABLED: "true" };
test("self deletion removes Auth, all private photos/data, sent/received memories, report copies and both block mirrors", async () => {
  const r = new SafetyRepository().member("a").member("b");
  for (const root of ["avatars", "portraits", "tracking", "journeys", "familyControls", "emailPreferences"]) r.seed(`${root}/a`, { private: "photo or data" });
  for (const sub of ["progress", "inbox", "devices", "levelNews"]) r.seed(`families/a/${sub}/x`, { private: true });
  for (const root of ["emailQueue", "mailJobs", "mailEvents"]) r.seed(`${root}/x`, { uid: "a", body: "private" });
  await sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Felicidades" }, now);
  await sendAnniversaryGreeting(r, "b", { recipientUid: "a", body: "Felicidades" }, now);
  await reportCommunityContent(r, "b", { targetType: "profile", targetId: "a", reason: "privacy" }, now);
  await setCommunityBlock(r, "b", "a", true, now);
  r.seed("families/b/inbox/from-admin", { senderUid: "a", body: "private", attachments: ["photo"] });
  r.seed("emailQueue/from-admin", { uid: "b", senderUid: "a", body: "private" });
  r.seed("mailJobs/admin-from-admin", { uid: "b", payload: { body: "private" } });
  const result = await requestOwnDeletion(r, "a", phrase, now);
  assert.equal(await r.get("families/b/inbox/from-admin"), null);
  assert.equal(await r.get("emailQueue/from-admin"), null);
  assert.equal(await r.get("mailJobs/admin-from-admin"), null);
  assert.equal(result.state, "complete"); assert.equal(await r.accountInfo("a"), null);
  assert.deepEqual([...r.docs.keys()].filter(p => p !== "accountDeletion/a" && p !== "selfDeletionJobs/a" && (p.endsWith("/a") || p.startsWith("families/a/") || p.startsWith("anniversaryMessages/") || p.startsWith("communityReports/") || p.startsWith("communityRelations/") || p.includes("/inbox/anniversary-"))), []);
  assert.ok(await r.get("families/b")); assert.ok(await r.accountInfo("b"));
  assert.equal((await requestOwnDeletion(r, "a", phrase, now)).state, "complete");
});
test("large cleanup is paginated and resumes automatically even when no administrator is available", async () => {
  const r = new SafetyRepository().member("a");
  for (let i = 0; i < 31; i++) r.seed(`families/a/progress/${i}`, { private: true });
  assert.equal((await requestOwnDeletion(r, "a", phrase, now)).state, "queued");
  assert.ok(await r.get("families/a"));
  await ownDeletionCycle(r, new Date(now.getTime() + 61000));
  assert.equal((await r.get("selfDeletionJobs/a")).data.state, "complete"); assert.equal(await r.get("families/a"), null);
});
test("permission failures do not delete data or lock out the user; transient cleanup retries after Auth deletion", async () => {
  const r = new SafetyRepository().member("a"); r.denyAuth = true;
  await assert.rejects(requestOwnDeletion(r, "a", phrase, now), /servicio/);
  assert.ok(await r.get("families/a")); assert.equal(await r.get("accountDeletion/a"), null); assert.ok(await r.accountInfo("a"));
  r.denyAuth = false; r.failRemove = true;
  assert.equal((await requestOwnDeletion(r, "a", phrase, now)).state, "queued"); assert.equal((await r.get("community/a")).data.visible, false);
  r.failRemove = false; await ownDeletionCycle(r, new Date(now.getTime() + 61000));
  assert.equal(await r.get("families/a"), null);
});
test("owner self deletion requires explicit valid succession and transfers ownership atomically", async () => {
  const r = new SafetyRepository().member("owner", "owner").member("admin", "admin").member("member");
  await assert.rejects(requestOwnDeletion(r, "owner", phrase, now), /administrador/);
  await assert.rejects(requestOwnDeletion(r, "owner", { ...phrase, successorUid: "member" }, now), /administrador activo/);
  assert.ok(await r.accountInfo("owner"));
  await requestOwnDeletion(r, "owner", { ...phrase, successorUid: "admin" }, now);
  assert.equal((await r.get("roles/admin")).data.role, "owner"); assert.equal(await r.accountInfo("owner"), null);
});
test("role promotion during self deletion cannot remove the new owner", async () => {
  const r = new SafetyRepository().member("a");
  r.beforeCommit = () => r.seed("roles/a", { role: "owner" });
  await assert.rejects(requestOwnDeletion(r, "a", phrase, now), /cambió/);
  assert.ok(await r.accountInfo("a")); assert.equal(await r.get("accountDeletion/a"), null);
});
test("self endpoint requires recent password authentication, uses token subject and accepts unverified incomplete registrations", async () => {
  const r = new SafetyRepository().member("a").member("b");
  r.accounts.set("a", { ...r.accounts.get("a"), verified: false }); r.docs.delete("families/a");
  const request = new Request("https://service.test/account/delete", { method: "POST", headers: { Authorization: "Bearer mock" }, body: JSON.stringify({ ...phrase, uid: "b" }) });
  const stale = await selfDeletionRequest(request.clone(), env, r, async () => ({ sub: "a", auth_time: seconds - 301 }), now);
  assert.equal(stale.status, 401); assert.ok(await r.accountInfo("a"));
  const result = await selfDeletionRequest(request, env, r, async () => ({ sub: "a", auth_time: seconds - 20 }), now);
  assert.equal(result.status, 200); assert.ok(await r.accountInfo("b")); assert.equal(await r.accountInfo("a"), null);
});
test("incorrect confirmation leaves account intact and administrative resets still protect owner/admin", async () => {
  const r = new SafetyRepository().member("owner", "owner").member("admin", "admin");
  await assert.rejects(requestOwnDeletion(r, "owner", { confirmation: "yes" }, now), /ELIMINAR MI CUENTA/);
  await assert.rejects(previewDeletion(r, "owner", { scope: "one", uid: "admin" }, now), /protegidos/);
  assert.ok(await r.accountInfo("owner")); assert.ok(await r.accountInfo("admin"));
});
