import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import type { Level, Progress, AppSettings } from "../src/domain/types.ts";
import { getJourney } from "../src/domain/journey.ts";
import { emptyProgress, canCompleteJourney } from "../src/domain/progress.ts";
import { guideKey, guideSteps, helpSections } from "../src/domain/help.ts";
const require = createRequire(import.meta.url);
const validation: typeof import("../src/domain/admin-validation") = require("../functions/lib/src/domain/admin-validation.js");
const config: typeof import("../src/domain/settings") = require("../functions/lib/src/domain/settings.js");
const server = require("../functions/lib/functions/src/index.js");
const base: Level = JSON.parse(
  fs.readFileSync(new URL("../content/level-1.json", import.meta.url), "utf8"),
);
const done = (): Progress => ({
  ...emptyProgress(base.id),
  completions: base.challenges.map((c) => ({
    challengeId: c.id,
    completedAt: "2026-11-04T12:00:00Z",
    note: "",
  })),
  finishedAt: "2026-11-04T12:00:00Z",
});
const next: Level = {
  ...base,
  id: "nivel-2",
  order: 2,
  prerequisiteId: base.id,
  challenges: Array.from({ length: 50 }, (_, i) => ({
    ...base.challenges[i % 30],
    id: `reto-${i + 1}`,
    order: i + 1,
  })),
};
describe("Camino dinámico y cierre de niveles", () => {
  it("no muestra un final de camino mientras los datos todavía cargan", () => {
    assert.equal(getJourney([base], {}, false).state, "loading");
    assert.equal(getJourney([base], {}, false).current, undefined);
  });
  it("distingue un catálogo vacío de haber terminado todos los niveles", () => {
    assert.equal(getJourney([], {}).state, "empty");
    assert.equal(getJourney([base], { [base.id]: done() }).state, "completed");
  });
  it("resalta el primer nivel en un comienzo normal", () => {
    const j = getJourney([base], {});
    assert.equal(j.current?.id, base.id);
    assert.equal(j.state, "active");
  });
  it("los treinta retos sin cuestionario todavía corresponden al nivel actual", () => {
    const p = done();
    p.finishedAt = null;
    const j = getJourney([base, next], { [base.id]: p });
    assert.equal(j.current?.id, base.id);
    assert.equal(j.completed.length, 0);
  });
  it("al publicar un nivel nuevo después del cierre pasa de final a novedad disponible", () => {
    const progress = { [base.id]: done() };
    assert.equal(getJourney([base], progress).state, "completed");
    const j = getJourney([next, base], progress);
    assert.equal(j.state, "new");
    assert.equal(j.current?.challenges.length, 50);
    assert.equal(j.current?.id, next.id);
  });
  it("deja de anunciar el nivel como nuevo después del primer reto", () => {
    const p = emptyProgress(next.id);
    p.completions.push({
      challengeId: next.challenges[0].id,
      completedAt: "2026-11-05T12:00:00Z",
      note: "",
    });
    assert.equal(
      getJourney([base, next], { [base.id]: done(), [next.id]: p }).state,
      "active",
    );
  });
  it("un prerrequisito ausente no se confunde con el final de todos los capítulos", () => {
    assert.equal(getJourney([next], {}).state, "locked");
  });
  it("respeta un reto por día incluso al cambiar de nivel", () => {
    const p = done();
    p.nextAvailableAt = "2026-11-05T04:00:00Z";
    const progress = { [base.id]: p, [next.id]: emptyProgress(next.id) };
    assert.equal(
      canCompleteJourney(progress, new Date("2026-11-05T03:59:59Z")),
      false,
    );
    assert.equal(
      canCompleteJourney(progress, new Date("2026-11-05T04:00:00Z")),
      true,
    );
  });
});
describe("Configuración y publicación administrativa", () => {
  it("acepta un nuevo nivel de cincuenta retos", () => {
    assert.equal(validation.validateLevel(next).challenges.length, 50);
  });
  it("rechaza identificadores duplicados, orden roto y preguntas vacías", () => {
    const broken = structuredClone(next);
    broken.challenges[1].id = broken.challenges[0].id;
    assert.throws(() => validation.validateLevel(broken));
    broken.challenges[1].id = "ok";
    broken.challenges[1].order = 500;
    assert.throws(() => validation.validateLevel(broken));
    assert.throws(() => validation.validateLevel({ ...next, questions: [] }));
  });
  it("un nivel publicado conserva sus retos, orden, preguntas y prerrequisito", () => {
    assert.equal(
      validation.canEditPublishedLevel(base, {
        ...base,
        title: "Portada revisada",
      }),
      true,
    );
    assert.equal(
      validation.canEditPublishedLevel(base, { ...base, published: false }),
      false,
    );
    assert.equal(
      validation.canEditPublishedLevel(base, { ...base, order: 2 }),
      false,
    );
    const changed = structuredClone(base);
    changed.challenges[0].description = "Otro reto";
    assert.equal(validation.canEditPublishedLevel(base, changed), false);
  });
  it("comparar contenido publicado no depende del orden de claves de Firestore", () => {
    const reordered = {
      ...base,
      challenges: base.challenges.map((c) =>
        Object.fromEntries(Object.entries(c).reverse()),
      ),
    } as Level;
    assert.equal(validation.canEditPublishedLevel(reordered, base), true);
  });
  it("valida mensajes, contacto y enlaces de soporte", () => {
    const settings: AppSettings = structuredClone(config.defaultSettings);
    assert.deepEqual(config.validateSettings(settings), settings);
    assert.throws(() =>
      config.validateSettings({
        ...settings,
        supportUrl: "javascript:alert(1)",
      }),
    );
    assert.throws(() =>
      config.validateSettings({ ...settings, supportEmail: "sin-correo" }),
    );
    assert.throws(() => config.validateSettings({ ...settings, endTitle: "" }));
    assert.throws(() =>
      config.validateSettings({ ...settings, notificationsEnabled: "true" }),
    );
  });
  it("el perfil administrativo elimina campos no permitidos y valida fechas", () => {
    const family = {
      name: "Familia",
      partner1: "Ana",
      partner2: "Luis",
      children: [],
      timezone: "America/La_Paz",
      admin: true,
    };
    const result = validation.validateFamilyProfile(family);
    assert.equal("admin" in result, false);
    assert.throws(() =>
      validation.validateFamilyProfile({
        ...family,
        marriageDate: "2099-01-01",
      }),
    );
  });
  it("un texto true o un correo no concede permisos administrativos", () => {
    assert.equal(validation.hasAdminClaim({ admin: "true" }), false);
    assert.equal(
      validation.hasAdminClaim({ email: "admin@example.com" }),
      false,
    );
    assert.equal(validation.hasAdminClaim({ admin: true }), true);
  });
});
describe("Protección real de las funciones administrativas sin credenciales de producción", () => {
  for (const name of [
    "adminBootstrap",
    "adminSaveSettings",
    "adminSaveLevel",
    "adminFindFamily",
    "adminUpdateFamily",
    "adminSetFamilyReminders",
  ]) {
    it(`${name} rechaza una petición anónima`, async () => {
      await assert.rejects(
        server[name].run({ data: {} }),
        (e: { code: string }) => e.code === "unauthenticated",
      );
    });
    it(`${name} rechaza a un usuario normal aunque mande admin en el cuerpo`, async () => {
      await assert.rejects(
        server[name].run({
          data: { admin: true },
          auth: { uid: "regular-user", token: { admin: false } },
        }),
        (e: { code: string }) => e.code === "permission-denied",
      );
    });
  }
});
describe("Guía de bienvenida e información permanente", () => {
  it("la guía vista se guarda por cuenta y por versión", () => {
    assert.notEqual(guideKey("family-a"), guideKey("family-b"));
    assert.match(guideKey("family-a"), /guide-v1/);
  });
  it("incluye cuenta compartida, retos, niveles, avisos y acceso posterior a Información", () => {
    assert.equal(guideSteps.length, 5);
    const text = guideSteps.map((s) => s.body).join(" ");
    for (const word of [
      "cuenta",
      "reto",
      "nivel",
      "recordatorios",
      "Información",
    ])
      assert.ok(text.includes(word));
    assert.ok(helpSections.length >= 10);
  });
});
