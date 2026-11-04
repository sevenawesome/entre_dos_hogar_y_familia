import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import type { Family, AnniversaryCatalog } from "../src/domain/types.ts";
import { getAnniversary, reminderContent } from "../src/domain/anniversary.ts";
const require = createRequire(import.meta.url);
const {
  getFamilyBirthdays,
}: typeof import("../src/domain/birthdays") = require("../functions/lib/src/domain/birthdays.js");
const timezone = "America/La_Paz";
const now = new Date("2026-11-04T16:00:00Z");
const base: Family = {
  name: "Familia de prueba",
  partner1: "Ana",
  partner2: "Luis",
  timezone,
  children: [],
};
describe("Años cumplidos y categorías de bodas", () => {
  it("distingue los nueve años cumplidos del décimo aniversario próximo", () => {
    const a = getAnniversary("2016-11-06", timezone, now)!;
    assert.equal(a.currentYears, 9);
    assert.equal(a.years, 10);
  });
  it("aumenta los años cumplidos exactamente el día del aniversario", () => {
    const a = getAnniversary("2016-11-04", timezone, now)!;
    assert.equal(a.currentYears, 10);
    assert.equal(a.isToday, true);
  });
  it("mantiene cero años cumplidos durante el primer año de matrimonio", () => {
    const a = getAnniversary("2026-10-01", timezone, now)!;
    assert.equal(a.currentYears, 0);
    assert.equal(a.years, 1);
  });
  it("el catálogo incluye los 50 primeros años y diez hitos posteriores sin duplicar años", () => {
    const catalog: AnniversaryCatalog = JSON.parse(
      fs.readFileSync(
        new URL("../content/anniversary-catalog.json", import.meta.url),
        "utf8",
      ),
    );
    assert.equal(catalog.milestones.length, 60);
    assert.equal(new Set(catalog.milestones.map((m) => m.year)).size, 60);
    for (let year = 1; year <= 50; year++)
      assert.ok(catalog.milestones.some((m) => m.year === year));
    assert.equal(
      catalog.milestones.find((m) => m.year === 1)?.material,
      "Papel",
    );
    assert.equal(
      catalog.milestones.find((m) => m.year === 2)?.material,
      "Algodón",
    );
    assert.equal(
      catalog.milestones.find((m) => m.year === 25)?.material,
      "Plata",
    );
    assert.equal(
      catalog.milestones.find((m) => m.year === 50)?.material,
      "Oro",
    );
    assert.ok(catalog.sources.length >= 2);
    assert.ok(catalog.milestones.every((m) => m.meaning && m.invitation));
  });
});
describe("Cumpleaños de la pareja y sus hijos", () => {
  it("es compatible con las familias anteriores sin cumpleaños", () => {
    assert.deepEqual(getFamilyBirthdays(base, now), []);
  });
  it("calcula edad actual y próxima edad, ordenando por días restantes", () => {
    const results = getFamilyBirthdays(
      {
        ...base,
        partner1BirthDate: "1990-11-06",
        partner2BirthDate: "1989-12-01",
        children: [
          {
            id: "child-1",
            name: "Sofía",
            kind: "hija",
            birthDate: "2018-11-05",
          },
        ],
      },
      now,
    );
    assert.deepEqual(
      results.map((b) => b.name),
      ["Sofía", "Ana", "Luis"],
    );
    assert.equal(results[0].currentAge, 7);
    assert.equal(results[0].nextAge, 8);
    assert.equal(results[0].daysRemaining, 1);
    assert.equal(results[1].currentAge, 35);
    assert.equal(results[1].nextAge, 36);
    assert.equal(results[1].daysRemaining, 2);
  });
  it("en el cumpleaños muestra la edad recién cumplida y la barra completa", () => {
    const [b] = getFamilyBirthdays(
      { ...base, partner1BirthDate: "1990-11-04" },
      now,
    );
    assert.equal(b.currentAge, 36);
    assert.equal(b.nextAge, 36);
    assert.equal(b.daysRemaining, 0);
    assert.equal(b.progress, 100);
  });
  it("no atribuye un año a un bebé nacido hoy", () => {
    const [b] = getFamilyBirthdays(
      {
        ...base,
        children: [{ name: "Bebé", kind: "otro", birthDate: "2026-11-04" }],
      },
      now,
    );
    assert.equal(b.currentAge, 0);
    assert.equal(b.nextAge, 0);
    assert.equal(b.isToday, true);
  });
  it("conserva la identidad de hijos al cambiar su orden en la lista", () => {
    const children = [
      {
        id: "child-a",
        name: "A",
        kind: "hijo" as const,
        birthDate: "2010-11-04",
      },
      {
        id: "child-b",
        name: "B",
        kind: "hija" as const,
        birthDate: "2012-11-04",
      },
    ];
    assert.deepEqual(
      getFamilyBirthdays({ ...base, children }, now).map((b) => b.key),
      getFamilyBirthdays(
        { ...base, children: [...children].reverse() },
        now,
      ).map((b) => b.key),
    );
  });
  it("atiende el 29 de febrero, fechas inválidas y el día de la zona familiar", () => {
    const leap = getFamilyBirthdays(
      { ...base, partner1BirthDate: "2000-02-29" },
      new Date("2027-02-28T16:00:00Z"),
    )[0];
    assert.equal(leap.isToday, true);
    assert.equal(leap.currentAge, 27);
    assert.equal(
      getFamilyBirthdays(
        {
          ...base,
          partner1BirthDate: "2030-01-01",
          partner2BirthDate: "2000-99-99",
        },
        now,
      ).length,
      0,
    );
    assert.equal(
      getFamilyBirthdays(
        { ...base, partner1BirthDate: "1990-11-04" },
        new Date("2026-11-05T02:00:00Z"),
      )[0].isToday,
      true,
    );
  });
});
describe("Avisos familiares con el reto como prioridad", () => {
  const birthdays = [
    { name: "Ana", age: 36, key: "ana:2026-11-04" },
    { name: "Luis", age: 37, key: "luis:2026-11-04" },
  ];
  it("recuerda dos cumpleaños simultáneos aunque no queden retos", () => {
    const m = reminderContent({
      anniversary: null,
      challengeReady: false,
      birthdays,
    })!;
    assert.match(m.body, /Ana/);
    assert.match(m.body, /36 años/);
    assert.match(m.body, /Luis/);
    assert.equal(m.birthdayKeys.length, 2);
  });
  it("deduplica por persona y fecha sin suprimir a quien todavía no recibió saludo", () => {
    const m = reminderContent({
      anniversary: null,
      challengeReady: false,
      birthdays,
      lastBirthdayKeys: [birthdays[0].key],
    })!;
    assert.deepEqual(m.birthdayKeys, [birthdays[1].key]);
    assert.equal(
      reminderContent({
        anniversary: null,
        challengeReady: false,
        birthdays,
        lastBirthdayKeys: birthdays.map((b) => b.key),
      }),
      null,
    );
  });
  it("combina aniversario, cumpleaños y reto en un solo mensaje", () => {
    const m = reminderContent({
      anniversary: getAnniversary("2016-11-04", timezone, now),
      birthdays,
      levelId: "nivel-1",
      challengeReady: true,
      challengeTitle: "Diez minutos sin pantallas",
    })!;
    assert.match(m.body, /10 años de matrimonio/);
    assert.match(m.body, /Ana/);
    assert.match(m.body, /Diez minutos sin pantallas/);
  });
  it("acota el mensaje para familias numerosas sin omitir el reto", () => {
    const many = Array.from({ length: 17 }, (_, i) => ({
      name: "🙂".repeat(20),
      age: i + 1,
      key: `child-${i}`,
    }));
    const m = reminderContent({
      anniversary: null,
      birthdays: many,
      levelId: "nivel-1",
      challengeReady: true,
      challengeTitle: "Nuestro reto",
    })!;
    assert.equal(m.birthdayKeys.length, 17);
    assert.match(m.body, /14 cumpleaños más/);
    assert.match(m.body, /Nuestro reto/);
    assert.ok(Buffer.byteLength(JSON.stringify(m)) < 3000);
  });
});
