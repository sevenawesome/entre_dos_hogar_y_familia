import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  communityDraft,
  publicProjection,
  supportStatus,
  AVATAR_LIMIT,
} from "../src/domain/community.ts";
import type { Family, ProgressMap } from "../src/domain/types.ts";
const family: Family = {
  name: "Familia",
  partner1: "Ana",
  partner2: "Luis",
  children: [{ name: "Privado", kind: "hijo", birthDate: "2018-02-01" }],
  marriageDate: "2016-11-08",
  partner1BirthDate: "1990-01-01",
  timezone: "America/La_Paz",
};
const progress: ProgressMap = {
  a: {
    levelId: "a",
    completions: [
      {
        challengeId: "c",
        completedAt: "2026-11-01T12:00:00Z",
        note: "Nunca pública",
      },
    ],
    answers: { q: "Respuesta privada" },
    finishedAt: null,
    nextAvailableAt: null,
  },
};
describe("Participación y privacidad de comunidad", () => {
  it("la participación y los dos tipos de datos empiezan desactivados", () => {
    const p = communityDraft("a", family);
    assert.equal(p.visible, false);
    assert.equal(p.shareAnniversary, false);
    assert.equal(p.shareProgress, false);
  });
  it("la proyección solo incluye datos consentidos y nunca hijos, cumpleaños o notas", () => {
    const p = publicProjection(
      {
        ...communityDraft("a", family),
        visible: true,
        shareAnniversary: true,
        shareProgress: true,
      },
      family,
      progress,
    );
    assert.equal(p.marriageDate, family.marriageDate);
    assert.equal(p.completedCount, 1);
    assert.equal("children" in p, false);
    assert.equal("partner1BirthDate" in p, false);
    assert.equal(JSON.stringify(p).includes("Nunca pública"), false);
    assert.equal(JSON.stringify(p).includes("Respuesta privada"), false);
  });
  it("retirar participación elimina fechas, foto y contadores públicos", () => {
    const p = publicProjection(
      {
        ...communityDraft("a", family),
        visible: false,
        shareAnniversary: true,
        shareProgress: true,
        avatar: "data:image/jpeg;base64,/9j/AA==",
      },
      family,
      progress,
    );
    assert.equal(p.avatar, null);
    assert.equal(p.marriageDate, null);
    assert.equal(p.completedCount, 0);
    assert.equal(p.shareProgress, false);
  });
  it("rechaza fotos demasiado grandes o formatos distintos de JPEG", () => {
    assert.throws(() =>
      publicProjection(
        {
          ...communityDraft("a", family),
          avatar: "data:image/jpeg;base64," + "A".repeat(AVATAR_LIMIT),
        },
        family,
        progress,
      ),
    );
    assert.throws(() =>
      publicProjection(
        { ...communityDraft("a", family), avatar: "https://externo/foto.jpg" },
        family,
        progress,
      ),
    );
  });
});
describe("Acompañamiento privado", () => {
  it("no confunde una familia recién registrada con una atrasada", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    const result = supportStatus(
      { joinedAt: "2026-11-04T12:00:00Z", lastCompletedAt: null } as any,
      now,
    );
    assert.equal(result.needsSupport, false);
    assert.equal(result.days, 1);
  });
  it("marca siete días sin avance con fechas del servidor", () => {
    const result = supportStatus(
      {
        joinedAt: "2026-10-01T12:00:00Z",
        lastCompletedAt: { seconds: Date.parse("2026-10-29T12:00:00Z") / 1000 },
      } as any,
      new Date("2026-11-05T12:00:00Z"),
    );
    assert.equal(result.needsSupport, true);
    assert.equal(result.days, 7);
  });
  it("un historial sin fechas no inventa inactividad", () =>
    assert.equal(
      supportStatus({ joinedAt: null, lastCompletedAt: null } as any)
        .needsSupport,
      false,
    ));
});
