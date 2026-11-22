import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { samePublicContent, acceptableCommunityText } = require("../functions/lib/src/domain/community-safety.js");
const { publicProjectionFromSummary } = require("../functions/lib/src/domain/community.js");
test("approved identity comparison tolerates Firestore map ordering but detects photo and name changes", () => {
  const a = { alias: "Familia", avatar: "photo", people: [{ key: "partner-1", name: "Ana", avatar: "jpeg", monthDay: "11-10", index: 0 }] };
  const reordered = { alias: "Familia", avatar: "photo", people: [{ index: 0, monthDay: "11-10", avatar: "jpeg", name: "Ana", key: "partner-1" }] };
  assert.equal(samePublicContent(a, reordered), true);
  assert.equal(samePublicContent(a, { ...reordered, avatar: "other" }), false);
  assert.equal(samePublicContent(a, { ...reordered, alias: "Other" }), false);
});
test("progress-only updates preserve approval while a newly shared birthday awaits review", () => {
  const family = { name: "Familia", partner1: "Ana", partner2: "Luis", children: [], timezone: "America/La_Paz", marriageDate: "2016-11-10", partner1BirthDate: "1990-11-10" };
  const profile = { uid: "a", alias: "Familia", visible: true, shareAnniversary: true, shareProgress: true, avatar: null, people: [], moderationStatus: "approved" };
  assert.equal(publicProjectionFromSummary(profile, family, { totalCompleted: 2, finishedCount: 0 }).moderationStatus, "approved");
  assert.equal(publicProjectionFromSummary(profile, family, { totalCompleted: 2, finishedCount: 0 }, { "partner-1": { dataUri: null, shareBirthday: true } }).moderationStatus, "pending");
  assert.equal(publicProjectionFromSummary({ ...profile, visible: false }, family, { totalCompleted: 2, finishedCount: 0 }).moderationStatus, "private");
});
test("community text filter permits Spanish celebrations and rejects links and accent-obfuscated threats", () => {
  assert.equal(acceptableCommunityText("¡Felicidades! Que Dios bendiga a su familia ♡"), true);
  assert.equal(acceptableCommunityText("Voy a mátarte"), false);
  assert.equal(acceptableCommunityText("www.example.com"), false);
});
