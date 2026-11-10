import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { Family, Level } from "../src/domain/types.ts";
const require = createRequire(import.meta.url);
const {
  familyCelebrations,
}: typeof import("../src/domain/celebrations") = require("../functions/lib/src/domain/celebrations.js");
const {
  createLevelDraft,
  newChallenge,
  reorderChallenges,
}: typeof import("../src/domain/level-editor") = require("../functions/lib/src/domain/level-editor.js");
const {
  levelIntroduction,
  unreadLevelNews,
  levelNewsNotice,
}: typeof import("../src/domain/level-news") = require("../functions/lib/src/domain/level-news.js");
const base: Level = {
  id: "nivel-1",
  order: 1,
  title: "Primero",
  subtitle: "Juntos",
  description: "Presentación pública",
  published: true,
  prerequisiteId: null,
  challenges: [
    {
      id: "reto-1",
      order: 1,
      title: "Actividad privada",
      description: "Contenido que no debe aparecer en el anuncio",
      reflection: "Pregunta privada",
      stage: "Etapa",
      minutes: 15,
    },
  ],
  questions: [{ id: "q1", label: "Pregunta final privada" }],
};
const family: Family = {
  name: "Familia A",
  partner1: "Ana",
  partner2: "Luis",
  children: [],
  timezone: "America/La_Paz",
  marriageDate: "2016-11-12",
  partner1BirthDate: "1990-11-12",
};
test("celebrations distinguish current years from upcoming years before, on and after the date", () => {
  const before = familyCelebrations(
    "a",
    family,
    new Date("2026-11-10T16:00:00Z"),
  );
  assert.equal(before[0].current, "Actualmente: 9 años de matrimonio.");
  assert.match(before[0].upcoming, /cumplirán 10 años/);
  assert.match(before[1].current, /Actualmente: 35 años/);
  assert.match(before[1].upcoming, /cumplirá 36 años/);
  const today = familyCelebrations(
    "a",
    family,
    new Date("2026-11-12T16:00:00Z"),
  );
  assert.match(today[0].current, /10 años/);
  assert.match(today[0].upcoming, /Hoy celebran 10/);
  assert.match(today[1].current, /36 años/);
  assert.match(today[1].upcoming, /Hoy cumple 36/);
  const after = familyCelebrations(
    "a",
    family,
    new Date("2026-11-13T16:00:00Z"),
  );
  assert.match(after[0].current, /10 años/);
  assert.match(after[0].upcoming, /11 años/);
  assert.match(after[1].current, /36 años/);
  assert.match(after[1].upcoming, /37 años/);
});
test("celebrations keep calendar timezone and leap-day behavior", () => {
  const f = {
    ...family,
    marriageDate: "2020-02-29",
    partner1BirthDate: "2000-02-29",
  };
  const due = familyCelebrations("a", f, new Date("2026-02-28T16:00:00Z"));
  assert.equal(due[0].days, 0);
  assert.match(due[0].current, /6 años/);
  assert.match(due[1].current, /26 años/);
  const zone = familyCelebrations(
    "a",
    family,
    new Date("2026-11-12T02:00:00Z"),
  );
  assert.equal(zone[0].days, 1);
  assert.match(zone[0].current, /9 años/);
});
test("new drafts follow all reserved orders and use the last published prerequisite", () => {
  const draft = createLevelDraft([
    base,
    { ...base, id: "nivel-2", order: 2, published: false },
  ]);
  assert.equal(draft.order, 3);
  assert.equal(draft.published, false);
  assert.equal(draft.prerequisiteId, base.id);
  assert.equal(createLevelDraft([]).prerequisiteId, null);
  const added = newChallenge([
    base.challenges[0],
    { ...base.challenges[0], id: "reto-3", order: 2 },
  ]);
  assert.equal(added.id, "reto-2");
  assert.equal(added.order, 3);
  const moved = reorderChallenges([base.challenges[0], added], 1, 0);
  assert.deepEqual(
    moved.map((c) => c.id),
    ["reto-2", "reto-1"],
  );
  assert.deepEqual(
    moved.map((c) => c.order),
    [1, 2],
  );
});
test("public introductions whitelist metadata and never carry activity or questionnaire content", () => {
  const intro = levelIntroduction(base),
    serialized = JSON.stringify(intro);
  assert.equal(intro.challengeCount, 1);
  assert.equal(intro.questionCount, 1);
  assert.ok(!serialized.includes("Actividad privada"));
  assert.ok(!serialized.includes("Pregunta privada"));
  assert.ok(!serialized.includes("Contenido que"));
  assert.ok(!serialized.includes("Pregunta final privada"));
  assert.equal("challenges" in intro, false);
  assert.equal("questions" in intro, false);
});
test("announcements reach families with unfinished previous levels and disappear only after acknowledgement", () => {
  const next = { ...base, id: "nivel-2", order: 2, prerequisiteId: base.id };
  const draft = { ...next, id: "nivel-3", order: 3, published: false };
  assert.deepEqual(
    unreadLevelNews([draft, next, base], []).map((l) => l.id),
    ["nivel-2"],
  );
  assert.deepEqual(unreadLevelNews([base, next], [next.id]), []);
  assert.equal(unreadLevelNews([base, next], [])[0].prerequisiteId, base.id);
});
test("new-level notices batch fresh publications, exclude drafts and deduplicate per phone", () => {
  const next = { ...base, id: "nivel-2", order: 2 },
    third = { ...base, id: "nivel-3", order: 3 };
  const first = levelNewsNotice([base, next, third], [], []);
  assert.deepEqual(first?.ids, [next.id, third.id]);
  assert.equal(first?.levelId, next.id);
  assert.ok(!first?.body.includes("Contenido que"));
  assert.equal(
    levelNewsNotice([base, next, third], [], [next.id, third.id]),
    null,
  );
  assert.equal(
    levelNewsNotice([base, next, third], [next.id, third.id], []),
    null,
  );
  assert.deepEqual(
    levelNewsNotice([base, next, third], [next.id], [next.id])?.ids,
    [third.id],
  );
});
