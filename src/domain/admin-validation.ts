import type { Family, Level } from "./types";
import { isCalendarDate, localDateISO } from "./anniversary";
const id = (v: unknown) =>
  typeof v === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
export function validateLevel(input: unknown): Level {
  const level = input as Level;
  if (
    !level ||
    !id(level.id) ||
    !Number.isInteger(level.order) ||
    level.order < 1 ||
    !text(level.title, 100) ||
    !text(level.subtitle, 300) ||
    !text(level.description, 2000) ||
    typeof level.published !== "boolean" ||
    !(level.prerequisiteId === null || id(level.prerequisiteId))
  )
    throw new Error("Revisa los datos generales del nivel.");
  if (
    !Array.isArray(level.challenges) ||
    level.challenges.length < 1 ||
    level.challenges.length > 200 ||
    !Array.isArray(level.questions) ||
    level.questions.length < 1 ||
    level.questions.length > 30
  )
    throw new Error("El nivel necesita 1–200 retos y 1–30 preguntas.");
  const ids = new Set<string>();
  for (const [index, c] of level.challenges.entries()) {
    if (
      !c ||
      !id(c.id) ||
      ids.has(c.id) ||
      c.order !== index + 1 ||
      !text(c.title, 100) ||
      !text(c.description, 4000) ||
      !text(c.reflection, 1000) ||
      !text(c.stage, 100) ||
      !Number.isInteger(c.minutes) ||
      c.minutes < 1 ||
      c.minutes > 240
    )
      throw new Error(
        `Revisa el reto ${index + 1}: identificador, orden, textos y minutos.`,
      );
    ids.add(c.id);
  }
  ids.clear();
  for (const q of level.questions) {
    if (!q || !id(q.id) || ids.has(q.id) || !text(q.label, 300))
      throw new Error("Revisa las preguntas finales.");
    ids.add(q.id);
  }
  if (
    (level.order === 1 && level.prerequisiteId !== null) ||
    (level.order > 1 && !level.prerequisiteId)
  )
    throw new Error(
      "El primer nivel empieza sin prerrequisito y los siguientes requieren uno.",
    );
  if (JSON.stringify(level).length > 200000)
    throw new Error("El contenido de este nivel es demasiado grande.");
  return {
    id: level.id,
    order: level.order,
    title: level.title.trim(),
    subtitle: level.subtitle.trim(),
    description: level.description.trim(),
    published: level.published,
    prerequisiteId: level.prerequisiteId,
    challenges: level.challenges.map((c) => ({
      id: c.id,
      order: c.order,
      title: c.title.trim(),
      description: c.description.trim(),
      reflection: c.reflection.trim(),
      stage: c.stage.trim(),
      minutes: c.minutes,
    })),
    questions: level.questions.map((q) => ({
      id: q.id,
      label: q.label.trim(),
    })),
  };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function canEditPublishedLevel(before: Level, after: Level) {
  return (
    before.id === after.id &&
    before.order === after.order &&
    before.prerequisiteId === after.prerequisiteId &&
    after.published &&
    JSON.stringify(canonical(before.challenges)) ===
      JSON.stringify(canonical(after.challenges)) &&
    JSON.stringify(canonical(before.questions)) ===
      JSON.stringify(canonical(after.questions))
  );
}
export function hasAdminClaim(claims: unknown) {
  return (
    !!claims &&
    typeof claims === "object" &&
    (claims as { admin?: unknown }).admin === true
  );
}
export function validateFamilyProfile(family: Family) {
  if (
    !family ||
    !text(family.name, 60) ||
    !text(family.partner1, 40) ||
    !text(family.partner2, 40) ||
    !Array.isArray(family.children) ||
    family.children.length > 10 ||
    !text(family.timezone, 100)
  )
    throw new Error("Perfil familiar inválido.");
  new Intl.DateTimeFormat("es", { timeZone: family.timezone }).format();
  if (
    family.children.some(
      (c) =>
        !c ||
        !text(c.name, 40) ||
        !["hijo", "hija", "otro"].includes(c.kind) ||
        (c.id !== undefined && !id(c.id)),
    )
  )
    throw new Error("Revisa los hijos de la familia.");
  const date = (value?: string | null) => {
    if (value == null) return null;
    if (
      typeof value !== "string" ||
      !isCalendarDate(value) ||
      value > localDateISO(family.timezone)
    )
      throw new Error("Fecha familiar inválida o futura.");
    return value;
  };
  return {
    name: family.name.trim(),
    partner1: family.partner1.trim(),
    partner2: family.partner2.trim(),
    timezone: family.timezone,
    marriageDate: date(family.marriageDate),
    partner1BirthDate: date(family.partner1BirthDate),
    partner2BirthDate: date(family.partner2BirthDate),
    children: family.children.map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      name: c.name.trim(),
      kind: c.kind,
      birthDate: date(c.birthDate),
    })),
  };
}
