import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const {
  emailDefaults,
  nextEmailDate,
  dailyEmailDraft,
} = require("../functions/lib/src/domain/email-reminders.js");
const base = {
  ...emailDefaults("America/La_Paz"),
  enabled: true,
  challenges: true,
  celebrations: true,
  adminMessages: true,
};
const family = {
  name: "Familia",
  partner1: "Ana",
  partner2: "Luis",
  timezone: base.timezone,
  marriageDate: "2016-11-06",
  partner1BirthDate: "1990-11-06",
  children: [{ id: "c", name: "Sol", kind: "hija", birthDate: "2018-11-06" }],
};
const level = {
  id: "l1",
  title: "Primer nivel",
  order: 1,
  published: true,
  prerequisiteId: null,
  challenges: [
    { id: "a", title: "Escucharnos" },
    { id: "b", title: "Un abrazo" },
  ],
};
const summary = {
  levelId: "l1",
  completedCount: 0,
  totalCompleted: 0,
  finishedCount: 0,
  lastCompletedAt: null,
};
test("el correo es opcional y todas las categorías comienzan apagadas", () =>
  assert.deepEqual(Object.values(emailDefaults("UTC")).slice(0, 4), [
    false,
    false,
    false,
    false,
  ]));
test("correo diario conserva el mismo reto aunque transcurran varios días y nunca incluye notas", () => {
  for (const day of ["2026-11-05", "2026-11-09"]) {
    const draft = dailyEmailDraft(
      family,
      { ...base, celebrations: false },
      summary,
      [level],
      [],
      true,
      new Date(day + "T16:00:00Z"),
    );
    assert.match(draft.lines.join(" "), /Escucharnos/);
    assert.doesNotMatch(JSON.stringify(draft), /Un abrazo|note|answers/);
  }
});
test("no recuerda retos antes de comenzar o durante las 24 horas de espera", () => {
  assert.equal(
    dailyEmailDraft(
      family,
      { ...base, celebrations: false },
      summary,
      [level],
      [],
      false,
    ),
    null,
  );
  const completed = {
    ...summary,
    completedCount: 1,
    totalCompleted: 1,
    lastCompletedAt: "2026-11-05T20:00:00Z",
  };
  assert.equal(
    dailyEmailDraft(
      family,
      { ...base, celebrations: false },
      completed,
      [level],
      [],
      true,
      new Date("2026-11-06T19:59:59Z"),
    ),
    null,
  );
  assert.match(
    dailyEmailDraft(
      family,
      { ...base, celebrations: false },
      completed,
      [level],
      [],
      true,
      new Date("2026-11-06T20:00:00Z"),
    ).lines[0],
    /Un abrazo/,
  );
});
test("combina cumpleaños y aniversario en un solo resumen sin publicar años de nacimiento", () => {
  const draft = dailyEmailDraft(
    family,
    base,
    summary,
    [level],
    [],
    true,
    new Date("2026-11-06T16:00:00Z"),
  );
  assert.equal(draft.lines.length, 4);
  assert.match(draft.lines.join(" "), /10 años|Ana|Sol/);
  assert.doesNotMatch(JSON.stringify(draft), /1990|2018/);
});
test("fin sin nuevo nivel no envía recordatorios de retos; una reflexión pendiente sí", () => {
  assert.equal(
    dailyEmailDraft(
      family,
      { ...base, celebrations: false },
      summary,
      [level],
      ["l1"],
      true,
    ),
    null,
  );
  assert.match(
    dailyEmailDraft(
      family,
      { ...base, celebrations: false },
      { ...summary, completedCount: 2 },
      [level],
      [],
      true,
    ).lines[0],
    /reflexión final/,
  );
});
test("celebra el 29 de febrero el 28 en un año no bisiesto", () => {
  const f = {
    ...family,
    marriageDate: "2020-02-29",
    partner1BirthDate: null,
    children: [],
  };
  assert.match(
    dailyEmailDraft(
      f,
      { ...base, challenges: false },
      summary,
      [level],
      [],
      false,
      new Date("2027-02-28T12:00:00Z"),
    ).lines[0],
    /7 años/,
  );
});
test("horario de correo respeta la zona y pasa al día siguiente si ya llegó", () => {
  assert.equal(
    nextEmailDate(
      base.timezone,
      20,
      0,
      new Date("2026-11-06T22:00:00Z"),
    ).toISOString(),
    "2026-11-07T00:00:00.000Z",
  );
  assert.equal(
    nextEmailDate(
      base.timezone,
      20,
      0,
      new Date("2026-11-07T00:00:01Z"),
    ).toISOString(),
    "2026-11-08T00:00:00.000Z",
  );
});
test("horario salta un hueco DST y no repite el correo en la hora duplicada", () => {
  assert.equal(
    nextEmailDate(
      "America/New_York",
      2,
      30,
      new Date("2026-03-08T06:00:00Z"),
    ).toISOString(),
    "2026-03-08T07:00:00.000Z",
  );
  assert.equal(
    nextEmailDate(
      "America/New_York",
      2,
      30,
      new Date("2026-03-08T07:05:00Z"),
    ).toISOString(),
    "2026-03-09T06:30:00.000Z",
  );
  assert.equal(
    nextEmailDate(
      "America/New_York",
      1,
      30,
      new Date("2026-11-01T05:45:00Z"),
    ).toISOString(),
    "2026-11-02T06:30:00.000Z",
  );
});
