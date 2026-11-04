import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  currentChallenge,
  emptyProgress,
  isUnlocked,
  percentage,
  canComplete,
  nextLocalDay,
} from "../src/domain/progress.ts";
import { nextReminder, validTimezone } from "../functions/src/timing.ts";
import type { Level } from "../src/domain/types.ts";
const level: Level = JSON.parse(
  fs.readFileSync(new URL("../content/level-1.json", import.meta.url), "utf8"),
);
describe("Contenido original", () => {
  it("contiene exactamente los 30 retos en orden sin duplicados y seis preguntas finales", () => {
    assert.equal(level.challenges.length, 30);
    assert.deepEqual(
      level.challenges.map((c) => c.order),
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
    assert.equal(new Set(level.challenges.map((c) => c.id)).size, 30);
    assert.equal(level.questions.length, 6);
    assert.equal(level.challenges[29].title, "Ceremonia de los 30 retos");
  });
  it("conserva los grupos reales del documento, con numeración consistente", () => {
    assert.equal(new Set(level.challenges.map((c) => c.stage)).size, 8);
    assert.equal(level.challenges[4].stage, "Aprender a escucharse");
  });
});
describe("Progreso compartido y niveles", () => {
  it("empieza por el primer reto y 0%", () => {
    assert.equal(currentChallenge(level)?.id, "reto-01");
    assert.equal(percentage(level), 0);
  });
  it("mantiene un reto pendiente hasta completarlo y avanza al siguiente", () => {
    const p = emptyProgress(level.id);
    p.completions.push({
      challengeId: "reto-01",
      completedAt: "2026-11-04T12:00:00Z",
      note: "",
    });
    assert.equal(currentChallenge(level, p)?.id, "reto-02");
    assert.equal(percentage(level, p), 3);
  });
  it("al completar todos los retos deja disponible la evaluación", () => {
    const p = emptyProgress(level.id);
    p.completions = level.challenges.map((c) => ({
      challengeId: c.id,
      note: "",
      completedAt: "2026-11-04T12:00:00Z",
    }));
    assert.equal(currentChallenge(level, p), undefined);
    assert.equal(percentage(level, p), 100);
  });
  it("solo desbloquea el siguiente nivel después del cuestionario", () => {
    const next = { ...level, id: "nivel-2", prerequisiteId: level.id };
    const p = emptyProgress(level.id);
    assert.equal(isUnlocked(next, { [level.id]: p }), false);
    p.finishedAt = new Date().toISOString();
    assert.equal(isUnlocked(next, { [level.id]: p }), true);
  });
  it("bloquea un segundo reto el mismo día y lo abre al llegar la fecha", () => {
    const p = {
      ...emptyProgress(level.id),
      nextAvailableAt: "2026-11-05T04:00:00Z",
    };
    assert.equal(canComplete(p, new Date("2026-11-05T03:59:59Z")), false);
    assert.equal(canComplete(p, new Date("2026-11-05T04:00:00Z")), true);
  });
});
describe("Días y recordatorios por zona horaria", () => {
  it("usa la medianoche de Bolivia y no la fecha UTC", () => {
    const next = new Date(
      nextLocalDay("America/La_Paz", new Date("2026-11-05T02:00:00Z")),
    );
    assert.ok(
      Math.abs(next.getTime() - new Date("2026-11-05T04:00:00Z").getTime()) <
        2000,
    );
  });
  it("respeta un día de 23 horas durante el cambio de horario", () => {
    const next = new Date(
      nextLocalDay("America/New_York", new Date("2026-03-08T05:00:00Z")),
    );
    assert.ok(
      Math.abs(next.getTime() - new Date("2026-03-09T04:00:00Z").getTime()) <
        2000,
    );
  });
  it("programa hoy si el horario todavía no pasó", () => {
    assert.equal(
      nextReminder(
        "America/La_Paz",
        20,
        0,
        new Date("2026-11-04T12:00:00Z"),
      ).toISOString(),
      "2026-11-05T00:00:00.000Z",
    );
  });
  it("programa mañana si ya llegó o pasó el horario y no reenvía al refrescar", () => {
    assert.equal(
      nextReminder(
        "America/La_Paz",
        20,
        0,
        new Date("2026-11-05T00:00:00Z"),
      ).toISOString(),
      "2026-11-06T00:00:00.000Z",
    );
  });
  it("salta una hora inexistente por cambio de horario", () => {
    assert.equal(
      nextReminder(
        "America/New_York",
        2,
        30,
        new Date("2026-03-08T05:00:00Z"),
      ).toISOString(),
      "2026-03-09T06:30:00.000Z",
    );
  });
  it("rechaza zonas horarias inválidas", () => {
    assert.equal(validTimezone("America/La_Paz"), true);
    assert.equal(validTimezone("Bogus/Nowhere"), false);
    assert.equal(validTimezone(null), false);
  });
});
