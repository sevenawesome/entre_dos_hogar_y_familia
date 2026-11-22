import { test } from "node:test";
import assert from "node:assert/strict";
import { listSafeCommunity, setCommunityBlock, reportCommunityContent, moderateCommunityProfile, resolveCommunityReport, sendAnniversaryGreeting, greetingId, moderationRequest } from "../.cache/email-worker/index.js";
import { SafetyRepository } from "./helpers/safety-repository.mjs";
const now = new Date("2026-11-10T20:00:00Z");
const setup = () => new SafetyRepository().member("owner", "owner").member("a").member("b");
test("pending, unapproved legacy, private and suspended profiles never enter member listings", async () => {
  const r = setup(); r.seed("community/a", { ...(await r.get("community/a")).data, moderationStatus: "pending" });
  r.seed("communityApprovals/b", { state: "suspended" });
  const rows = await listSafeCommunity(r, "a", null);
  assert.deepEqual(rows.profiles.map(p => p.uid), ["owner"]);
  r.docs.delete("communityApprovals/owner"); assert.equal((await listSafeCommunity(r, "a", null)).profiles.length, 0);
});
test("human approval requires permission, consent, verified account, acceptable names and unchanged content", async () => {
  const r = setup(), p = await r.get("community/a");
  await assert.rejects(moderateCommunityProfile(r, "b", { uid: "a", action: "approve", version: p.version }, now), /permiso/);
  r.seed("roles/b", { role: "admin" }); // Legacy admin grants do not include moderation.
  await assert.rejects(moderateCommunityProfile(r, "b", { uid: "a", action: "approve", version: p.version }, now), /permiso/);
  r.seed("roles/b", { role: "admin", permissions: ["community.moderate"] });
  r.docs.delete("communityConsents/a");
  await assert.rejects(moderateCommunityProfile(r, "b", { uid: "a", action: "approve", version: p.version }, now), /normas/);
  r.seed("communityConsents/a", { version: 1 });
  r.seed("community/a", { ...p.data, alias: "Foto cambiada" });
  await assert.rejects(moderateCommunityProfile(r, "b", { uid: "a", action: "approve", version: p.version }, now), /cambió/);
  const fresh = await r.get("community/a");
  await moderateCommunityProfile(r, "b", { uid: "a", action: "approve", version: fresh.version }, now);
  assert.equal((await r.get("communityApprovals/a")).data.alias, "Foto cambiada");
});
test("block hides profiles and denies greetings in both directions; unblocking one side does not undo the other block", async () => {
  const r = setup();
  await setCommunityBlock(r, "a", "b", true, now);
  assert.equal((await listSafeCommunity(r, "a", null)).profiles.some(p => p.uid === "b"), false);
  assert.equal((await listSafeCommunity(r, "b", null)).profiles.some(p => p.uid === "a"), false);
  for (const [from, to] of [["a", "b"], ["b", "a"]]) await assert.rejects(sendAnniversaryGreeting(r, from, { recipientUid: to, body: "Felicidades" }, now), /familias/);
  await setCommunityBlock(r, "b", "a", true, now); await setCommunityBlock(r, "a", "b", false, now);
  await assert.rejects(sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Felicidades" }, now), /familias/);
  await setCommunityBlock(r, "b", "a", false, now);
  assert.equal((await sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Felicidades" }, now)).ok, true);
});
test("a concurrent block or profile withdrawal prevents the greeting commit", async () => {
  for (const race of ["block", "withdraw"]) {
    const r = setup();
    r.beforeCommit = async () => {
      if (race === "block") await setCommunityBlock(r, "b", "a", true, now);
      else r.seed("community/b", { ...(await r.get("community/b")).data, visible: false });
    };
    await assert.rejects(sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Felicidades" }, now), /intentarlo/);
    assert.equal([...r.docs.keys()].filter(p => p.startsWith("anniversaryMessages/")).length, 0);
  }
});
test("reports contain only public profile or own received greeting, are idempotent per day and never expose unrelated private content", async () => {
  const r = setup();
  const input = { targetType: "profile", targetId: "a", reason: "privacy", detail: "No autorizó su foto" };
  assert.equal((await reportCommunityContent(r, "b", input, now)).alreadyReported, false);
  assert.equal((await reportCommunityContent(r, "b", input, now)).alreadyReported, true);
  const report = [...r.docs.values()].find(d => d.path.startsWith("communityReports/"));
  assert.deepEqual(Object.keys(report.data.snapshot).sort(), ["alias", "avatar", "people"]);
  await sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Felicidades" }, now);
  const id = await greetingId("a", "b", "2026-11-10");
  await assert.rejects(reportCommunityContent(r, "owner", { ...input, targetType: "greeting", targetId: id }, now), /Solo puedes/);
  await assert.rejects(reportCommunityContent(r, "a", input, now), /propio/);
  await reportCommunityContent(r, "b", { ...input, targetType: "greeting", targetId: id }, now);
});
test("moderation removes reported greeting and inbox copy without allowing replacement greeting", async () => {
  const r = setup(); await sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Felicidades" }, now);
  const id = await greetingId("a", "b", "2026-11-10");
  await reportCommunityContent(r, "b", { targetType: "greeting", targetId: id, reason: "harassment" }, now);
  const report = [...r.docs.values()].find(d => d.path.startsWith("communityReports/"));
  await resolveCommunityReport(r, "owner", { id: report.path.split("/").at(-1), action: "remove", note: "Incumple las normas" }, now);
  assert.equal((await r.get(`anniversaryMessages/${id}`)).data.moderationRemoved, true);
  assert.equal((await r.get(`families/b/inbox/anniversary-${id}`)).data.moderationRemoved, true);
  assert.equal((await sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Cambio el mensaje" }, now)).alreadySent, true);
});
test("suspension prevents publishing and messages until a moderator reinstates and approves again", async () => {
  const r = setup();
  const decide = async action => moderateCommunityProfile(r, "owner", { uid: "a", action, version: (await r.get("community/a")).version, note: "Revisión" }, now);
  await decide("suspend");
  await assert.rejects(decide("approve"), /suspensión/);
  await assert.rejects(sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Felicidades" }, now), /aprobado/);
  await decide("reinstate"); assert.equal((await r.get("community/a")).data.moderationStatus, "pending");
  await decide("approve"); assert.equal((await r.get("community/a")).data.moderationStatus, "approved");
});
test("text filter rejects threats, explicit language and links before storing a greeting", async () => {
  const r = setup();
  for (const body of ["voy a matarte", "https://spam.example.com", "fuck", "www.spam.com"]) await assert.rejects(sendAnniversaryGreeting(r, "a", { recipientUid: "b", body }, now), /no permitidos/);
  assert.equal([...r.docs.keys()].some(p => p.startsWith("anniversaryMessages/")), false);
});
test("HTTP moderation verifies live membership and permission before returning reported text or photos", async () => {
  const r = setup(), env = { FIREBASE_PROJECT_ID: "demo-entre-dos" };
  const request = new Request("https://service.test/community/moderation", { headers: { Authorization: "Bearer mock" } });
  const response = await moderationRequest(request, env, r, async () => ({ sub: "a", email_verified: true, auth_time: 1 }), now);
  assert.equal(response.status, 403); assert.equal((await response.text()).includes("Familia b"), false);
});

test("pending account deletion/deactivation suppress greetings even before profile cleanup finishes", async () => {
  for (const marker of ["accountDeletion", "accountSuspensions"]) {
    const r = setup(); r.seed(`${marker}/a`, { requestedAt: now });
    await assert.rejects(sendAnniversaryGreeting(r, "a", { recipientUid: "b", body: "Felicidades" }, now));
    await assert.rejects(moderateCommunityProfile(r, "owner", { uid: "a", action: "approve", version: (await r.get("community/a")).version }, now), /disponible/);
  }
});
