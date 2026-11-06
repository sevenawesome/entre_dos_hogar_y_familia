import { createRequire } from "node:module";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  Family,
  FamilyPortraits,
  ProgressMap,
} from "../src/domain/types.ts";
const require = createRequire(import.meta.url);
const people = require("../functions/lib/src/domain/people.js");
const community = require("../functions/lib/src/domain/community.js");
const timing = require("../functions/lib/src/domain/journey-timing.js");
const progress = require("../functions/lib/src/domain/progress.js");
const family: Family = {
  name: "Familia",
  partner1: "Ana",
  partner2: "Luis",
  timezone: "America/La_Paz",
  marriageDate: "2016-11-08",
  partner1BirthDate: "1990-11-06",
  partner2BirthDate: "1989-05-10",
  children: [
    { id: "child-a", name: "Sol", kind: "hija", birthDate: "2018-11-07" },
    { id: "child-b", name: "Leo", kind: "hijo", birthDate: "2020-02-29" },
  ],
};
const photo = "data:image/jpeg;base64,/9j/AA==";
describe("Fotos por persona y cumpleaños compartidos", () => {
  it("las fotos privadas no publican cumpleaños sin consentimiento individual", () => {
    const portraits: FamilyPortraits = {
      "partner-1": { dataUri: photo, shareBirthday: false },
    };
    assert.deepEqual(people.publicBirthdayPeople(family, portraits), []);
  });
  it("publica solo nombre, día y mes, y foto de las personas elegidas", () => {
    const portraits: FamilyPortraits = {
      "partner-1": { dataUri: photo, shareBirthday: true },
      "child-a": { dataUri: photo, shareBirthday: false },
    };
    const visible = people.publicBirthdayPeople(family, portraits);
    assert.equal(visible.length, 1);
    assert.equal(visible[0].monthDay, "11-06");
    assert.equal(visible[0].avatar, photo);
    assert.deepEqual(Object.keys(visible[0]).sort(), [
      "avatar",
      "index",
      "key",
      "monthDay",
      "name",
    ]);
    assert.equal(JSON.stringify(visible).includes("1990"), false);
    assert.equal(JSON.stringify(visible).includes("Sol"), false);
  });
  it("las fotos siguen al hijo correcto cuando cambia el orden y se retiran al eliminarlo", () => {
    const portraits: FamilyPortraits = {
      "child-a": { dataUri: photo, shareBirthday: true },
    };
    const reordered = { ...family, children: [...family.children].reverse() };
    const visible = people.publicBirthdayPeople(reordered, portraits);
    assert.equal(visible[0].name, "Sol");
    assert.equal(visible[0].index, 3);
    assert.equal(visible[0].avatar, photo);
    assert.deepEqual(
      people.validatePortraits(portraits, { ...family, children: [] }),
      {},
    );
  });
  it("rechaza fotos individuales grandes y direcciones externas", () => {
    for (const dataUri of [
      "data:image/jpeg;base64," + "A".repeat(people.PERSON_PHOTO_LIMIT),
      "https://example.com/picture.jpg",
    ])
      assert.throws(() =>
        people.validatePortraits(
          { "partner-1": { dataUri, shareBirthday: false } },
          family,
        ),
      );
  });
  it("retirar la participación borra también todos los cumpleaños y fotos individuales públicos", () => {
    const projected = community.publicProjection(
      { ...community.communityDraft("a", family), visible: false },
      family,
      {},
      { "partner-1": { dataUri: photo, shareBirthday: true } },
    );
    assert.deepEqual(projected.people, []);
  });
  it("muestra los próximos treinta días sin calcular ni revelar la edad", () => {
    const visible = people.publicBirthdayPeople(family, {
      "partner-1": { dataUri: photo, shareBirthday: true },
      "partner-2": { dataUri: null, shareBirthday: true },
    });
    const upcoming = people.upcomingCommunityBirthdays(
      visible,
      family.timezone,
      new Date("2026-11-05T12:00:00Z"),
    );
    assert.equal(upcoming.length, 1);
    assert.equal(upcoming[0].daysRemaining, 1);
    assert.equal("nextAge" in upcoming[0], false);
  });
});
describe("Inicio inmediato y avance después de completar", () => {
  const start = "2026-11-05T14:10:45.000Z";
  it("registrarse no inicia; comenzar permite el primer reto sin esperar", () => {
    assert.equal(timing.journeyStarted({}, null), false);
    assert.equal(
      timing.journeyStarted({}, { startedAt: start, levelId: "nivel-1" }),
      true,
    );
    assert.equal(timing.journeyAvailableAt({}), null);
    assert.equal(progress.canCompleteJourney({}, new Date(start)), true);
  });
  it("completar el primero horas después espera 24 horas desde el completado", () => {
    assert.equal(
      timing.nextChallengeAvailableAt("2026-11-05T20:00:00Z"),
      "2026-11-06T20:00:00.000Z",
    );
  });
  it("un reto pendiente varios días conserva su lugar y su propia espera al terminar", () => {
    const pending = {
      levelId: "nivel-1",
      completions: [],
      answers: {},
      finishedAt: null,
      nextAvailableAt: null,
    };
    assert.equal(timing.journeyAvailableAt({ "nivel-1": pending }), null);
    assert.equal(
      timing.nextChallengeAvailableAt("2026-11-10T18:00:00Z"),
      "2026-11-11T18:00:00.000Z",
    );
  });
  it("ambos teléfonos usan el completado confirmado por Firebase, aunque el reloj cliente sea incorrecto", () => {
    const p: ProgressMap = {
      "nivel-1": {
        levelId: "nivel-1",
        completions: [
          { challengeId: "r1", completedAt: "2099-01-01", note: "" },
        ],
        lastCompletionAt: "2026-11-05T20:00:00Z",
        answers: {},
        finishedAt: null,
        nextAvailableAt: "2099-01-01",
      },
    };
    assert.equal(
      progress.canCompleteJourney(p, new Date("2026-11-06T19:59:59Z")),
      false,
    );
    assert.equal(
      progress.canCompleteJourney(p, new Date("2026-11-06T20:00:00Z")),
      true,
    );
    assert.equal(timing.journeyAvailableAt(p), "2026-11-06T20:00:00.000Z");
  });
  it("conserva las esperas guardadas de perfiles anteriores sin fecha confirmada", () => {
    const p: ProgressMap = {
      "nivel-1": {
        levelId: "nivel-1",
        completions: [{ challengeId: "r1", completedAt: start, note: "" }],
        answers: {},
        finishedAt: null,
        nextAvailableAt: "2026-11-06T14:10:45Z",
      },
    };
    assert.equal(timing.journeyStarted(p, null), true);
    assert.equal(
      progress.canCompleteJourney(p, new Date("2026-11-06T14:10:00Z")),
      false,
    );
  });
});
