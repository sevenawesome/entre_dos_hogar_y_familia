import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAnniversary,
  parseMarriageDate,
  reminderContent,
  isCalendarDate,
  localDateISO,
} from "../src/domain/anniversary.ts";
const timezone = "America/La_Paz";
describe("Fecha de matrimonio y cuenta regresiva", () => {
  it("acepta fechas reales y rechaza futuras, inexistentes o incompletas", () => {
    const now = new Date("2026-11-04T16:00:00Z");
    assert.equal(parseMarriageDate("06/11/2016", timezone, now), "2016-11-06");
    assert.equal(parseMarriageDate("31/02/2020", timezone, now), null);
    assert.equal(parseMarriageDate("05/11/2026", timezone, now), null);
    assert.equal(parseMarriageDate("1/2/20", timezone, now), null);
    assert.equal(isCalendarDate("2023-02-29"), false);
    assert.equal(isCalendarDate("2024-02-29"), true);
  });
  it("muestra días restantes y los años que cumplirán, sin adelantar el aniversario", () => {
    const result = getAnniversary(
      "2016-11-06",
      timezone,
      new Date("2026-11-04T16:00:00Z"),
    )!;
    assert.equal(result.daysRemaining, 2);
    assert.equal(result.years, 10);
    assert.equal(result.isToday, false);
    assert.ok(result.progress >= 99);
  });
  it("el día exacto muestra Hoy, cero días y el aro completo", () => {
    const result = getAnniversary(
      "2016-11-04",
      timezone,
      new Date("2026-11-04T16:00:00Z"),
    )!;
    assert.equal(result.daysRemaining, 0);
    assert.equal(result.isToday, true);
    assert.equal(result.progress, 100);
    assert.equal(result.years, 10);
  });
  it("al pasar la fecha cuenta hacia el año siguiente y reinicia el aro", () => {
    const result = getAnniversary(
      "2016-11-03",
      timezone,
      new Date("2026-11-04T16:00:00Z"),
    )!;
    assert.equal(result.nextDate, "2027-11-03");
    assert.equal(result.daysRemaining, 364);
    assert.equal(result.years, 11);
    assert.ok(result.progress <= 1);
  });
  it("cruza diciembre y enero usando días de calendario", () => {
    const result = getAnniversary(
      "2020-01-01",
      timezone,
      new Date("2026-12-31T16:00:00Z"),
    )!;
    assert.equal(result.daysRemaining, 1);
    assert.equal(result.nextDate, "2027-01-01");
  });
  it("usa el día familiar incluso cuando la fecha UTC ya cambió", () => {
    const now = new Date("2026-11-05T02:00:00Z");
    assert.equal(localDateISO(timezone, now), "2026-11-04");
    assert.equal(getAnniversary("2016-11-04", timezone, now)?.isToday, true);
  });
  it("el 29 de febrero se celebra el 28 en años normales y el 29 en bisiestos", () => {
    assert.equal(
      getAnniversary("2020-02-29", timezone, new Date("2027-02-28T12:00:00Z"))
        ?.isToday,
      true,
    );
    const leap = getAnniversary(
      "2020-02-29",
      timezone,
      new Date("2028-02-28T12:00:00Z"),
    )!;
    assert.equal(leap.daysRemaining, 1);
    assert.equal(leap.nextDate, "2028-02-29");
  });
  it("no inventa un aniversario sin fecha o antes de cumplir el primer año", () => {
    assert.equal(getAnniversary(null, timezone), null);
    assert.equal(getAnniversary("2020-99-99", timezone), null);
    assert.equal(
      getAnniversary("2026-11-04", timezone, new Date("2026-11-04T16:00:00Z"))
        ?.years,
      1,
    );
    assert.equal(
      getAnniversary("2026-11-04", timezone, new Date("2026-11-04T16:00:00Z"))
        ?.isToday,
      false,
    );
  });
});
describe("Aviso de aniversario independiente de los niveles", () => {
  const anniversary = getAnniversary(
    "2016-11-04",
    timezone,
    new Date("2026-11-04T16:00:00Z"),
  )!;
  it("saluda aunque no haya niveles o ya estén todos conseguidos", () => {
    const message = reminderContent({ anniversary, challengeReady: false })!;
    assert.equal(message.title, "¡Feliz aniversario! ♡");
    assert.match(message.body, /10 años/);
    assert.equal(message.data.occasion, "anniversary");
    assert.equal(message.anniversaryKey, anniversary.key);
  });
  it("no repite el saludo ya confirmado para ese año y matrimonio", () => {
    assert.equal(
      reminderContent({
        anniversary,
        lastAnniversaryKey: anniversary.key,
        challengeReady: false,
      }),
      null,
    );
  });
  it("combina el saludo y el reto pendiente en el mismo aviso", () => {
    const message = reminderContent({
      anniversary,
      levelId: "nivel-1",
      challengeTitle: "Diez minutos sin pantallas",
      challengeReady: true,
    })!;
    assert.match(message.body, /Feliz|Hoy celebran/);
    assert.match(message.body, /Diez minutos sin pantallas/);
    assert.equal(message.data.levelId, "nivel-1");
  });
  it("no pierde el saludo cuando el siguiente reto está bloqueado hasta mañana", () => {
    assert.ok(
      reminderContent({
        anniversary,
        levelId: "nivel-1",
        challengeReady: false,
      })?.anniversaryKey,
    );
  });
  it("en días normales mantiene el recordatorio habitual y para si no hay retos", () => {
    assert.equal(
      reminderContent({ anniversary: null, challengeReady: false }),
      null,
    );
    const message = reminderContent({
      anniversary: null,
      levelId: "nivel-1",
      challengeTitle: "Una bienvenida diferente",
      challengeReady: true,
    })!;
    assert.match(message.body, /Una bienvenida diferente/);
    assert.equal(message.anniversaryKey, null);
  });
});
