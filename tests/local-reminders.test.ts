import { createRequire } from "node:module";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DevicePreferences, Family } from "../src/domain/types.ts";
const require = createRequire(import.meta.url);
const {
  localReminderPlan,
} = require("../functions/lib/src/domain/local-reminders.js");
process.env.TZ = "America/La_Paz";
const prefs: DevicePreferences = {
  enabled: true,
  hour: 20,
  minute: 0,
  timezone: "America/La_Paz",
};
const family: Family = {
  name: "Familia",
  partner1: "Ana",
  partner2: "Luis",
  timezone: prefs.timezone,
  marriageDate: "2016-11-08",
  partner1BirthDate: "1990-11-06",
  children: [],
};
describe("Programación local sin servidor", () => {
  it("mantiene un único recordatorio diario general mientras hay un nivel pendiente", () => {
    const plan = localReminderPlan(
      family,
      prefs,
      true,
      new Date("2026-11-05T12:00:00Z"),
    );
    assert.equal(plan.filter((p: any) => p.daily).length, 1);
    assert.match(plan[0].body, /ver su reto y progreso/);
  });
  it("recuerda el mismo reto pendiente aunque pasen varios días", () => {
    const challenge = {
      order: 1,
      title: "Una bienvenida diferente",
      availableAt: null,
    };
    for (const now of ["2026-11-05T12:00:00Z", "2026-11-10T12:00:00Z"]) {
      const reminder = localReminderPlan(
        family,
        prefs,
        true,
        new Date(now),
        challenge,
      )[0];
      assert.match(reminder.title, /Reto 1/);
      assert.match(reminder.body, /Una bienvenida diferente/);
      assert.match(reminder.body, /hasta que lo completen/);
      assert.doesNotMatch(reminder.body, /Reto 2/);
    }
  });
  it("al completar recuerda el siguiente e informa su espera sin anunciarlo como disponible antes de tiempo", () => {
    const next = {
      order: 2,
      title: "Diez minutos sin pantallas",
      availableAt: "2026-11-06T20:00:00Z",
    };
    const first = localReminderPlan(
      family,
      prefs,
      true,
      new Date("2026-11-06T12:00:00Z"),
      next,
    )[0];
    assert.match(first.title, /Reto 2/);
    assert.match(first.body, /Disponible a partir/);
    assert.doesNotMatch(first.body, /reto pendiente/);
    const ready = localReminderPlan(
      family,
      prefs,
      true,
      new Date(next.availableAt),
      next,
    )[0];
    assert.match(ready.body, /reto pendiente/);
    assert.match(ready.body, /Diez minutos sin pantallas/);
  });
  it("terminar los niveles quita el diario y conserva las celebraciones", () => {
    const plan = localReminderPlan(
      family,
      prefs,
      false,
      new Date("2026-11-05T12:00:00Z"),
    );
    assert.equal(
      plan.some((p: any) => p.daily),
      false,
    );
    assert.equal(plan.length, 4);
  });
  it("pausar no deja solicitudes futuras", () =>
    assert.deepEqual(
      localReminderPlan(family, { ...prefs, enabled: false }, true),
      [],
    ));
  it("respeta el 29 de febrero en cada uno de los dos años programados", () => {
    const plan = localReminderPlan(
      { ...family, marriageDate: "2020-02-29", partner1BirthDate: null },
      prefs,
      false,
      new Date("2027-01-01T12:00:00Z"),
    );
    assert.equal(plan[0].date.getMonth(), 1);
    assert.equal(plan[0].date.getDate(), 28);
    assert.equal(plan[1].date.getFullYear(), 2028);
    assert.equal(plan[1].date.getDate(), 29);
  });
  it("diez hijos y las fechas de pareja caben debajo del límite de solicitudes pendientes", () => {
    const plan = localReminderPlan(
      {
        ...family,
        partner2BirthDate: "1989-11-07",
        children: Array.from({ length: 10 }, (_, i) => ({
          name: `Hijo ${i}`,
          kind: "hijo",
          birthDate: "2018-11-20",
        })),
      },
      prefs,
      true,
      new Date("2026-11-05T12:00:00Z"),
    );
    assert.equal(plan.length, 27);
  });
  it("sin fechas registradas solo queda el recordatorio diario", () => {
    assert.equal(
      localReminderPlan(
        { ...family, marriageDate: null, partner1BirthDate: null },
        prefs,
        true,
      ).length,
      1,
    );
  });
});

it("anniversary reminder states the years and remains scheduled after finishing all challenges", () => {
  const plan = localReminderPlan(
    { ...family, partner1BirthDate: null },
    prefs,
    false,
    new Date("2026-11-08T12:00:00Z"),
  );
  assert.match(plan[0].body, /10 años/);
  assert.equal(plan[0].date.toISOString(), "2026-11-09T00:00:00.000Z");
  assert.ok(plan[0].anniversaryKey);
  assert.match(plan[1].body, /11 años/);
});
it("first opening after the anniversary reminder time still plans one greeting today", () => {
  const date = new Date("2026-11-09T01:00:00Z");
  const plan = localReminderPlan(
    { ...family, partner1BirthDate: null },
    prefs,
    false,
    date,
  );
  assert.equal(plan[0].date.getTime(), date.getTime() + 1500);
  assert.match(plan[0].body, /10 años/);
});

it("schedules one unlock notice at the actual end of the wait, independently from the daily hour", () => {
  const now = new Date("2026-11-11T16:32:10Z"),
    availableAt = "2026-11-12T16:32:10Z";
  const plan = localReminderPlan(family, prefs, true, now, {
    order: 3,
    title: "Escucharnos",
    availableAt,
  });
  const unlock = plan.filter((p: any) => p.challengeAvailable);
  assert.equal(unlock.length, 1);
  assert.equal(unlock[0].daily, undefined);
  assert.equal(unlock[0].date.getTime(), Date.parse(availableAt));
  assert.match(unlock[0].title, /ya está disponible/);
  assert.match(unlock[0].body, /Reto 3.*Escucharnos/);
  assert.equal(plan.filter((p: any) => p.daily).length, 1);
});
it("does not repeat unlock notices after availability, with paused reminders, or without a pending level", () => {
  const challenge = {
    order: 2,
    title: "Su reto",
    availableAt: "2026-11-12T16:32:10Z",
  };
  for (const now of [challenge.availableAt, "2026-11-13T16:32:10Z"]) {
    const plan = localReminderPlan(
      family,
      prefs,
      true,
      new Date(now),
      challenge,
    );
    assert.equal(
      plan.some((p: any) => p.challengeAvailable),
      false,
    );
    assert.match(plan[0].body, /hasta que lo completen/);
  }
  for (const [enabled, pending] of [
    [false, true],
    [true, false],
  ]) {
    const plan = localReminderPlan(
      family,
      { ...prefs, enabled },
      pending,
      new Date("2026-11-11T16:32:10Z"),
      challenge,
    );
    assert.equal(
      plan.some((p: any) => p.challengeAvailable),
      false,
    );
  }
});
it("does not schedule an unlock notification for an immediate first challenge or an invalid deadline", () => {
  for (const availableAt of [null, "invalid"]) {
    const plan = localReminderPlan(
      family,
      prefs,
      true,
      new Date("2026-11-11T16:32:10Z"),
      { order: 1, title: "Primer reto", availableAt },
    );
    assert.equal(
      plan.some((p: any) => p.challengeAvailable),
      false,
    );
  }
});
