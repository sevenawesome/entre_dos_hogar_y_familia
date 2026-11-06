import {
  defaultEmailSettings,
  renderEmailText,
  type EmailSettings,
} from "./email-settings";
import { getAnnualEvent, localDateISO, isCalendarDate } from "./anniversary";
import type { Family, FamilySummary, Level } from "./types";
export interface EmailPreferences {
  enabled: boolean;
  challenges: boolean;
  celebrations: boolean;
  adminMessages: boolean;
  hour: number;
  minute: number;
  timezone: string;
  version: number;
  nextDueAt: string | null;
}
export interface EmailServiceStatus extends EmailSettings {
  enabled: boolean;
  lastRunAt?: string;
  verifiedSenderDomain?: string;
}
export const emailServiceOff: EmailServiceStatus = {
  ...defaultEmailSettings,
  enabled: false,
};
export const emailDefaults = (timezone: string): EmailPreferences => ({
  enabled: false,
  challenges: false,
  celebrations: false,
  adminMessages: false,
  hour: 20,
  minute: 0,
  timezone,
  version: 0,
  nextDueAt: null,
});

const formatters = new Map<string, Intl.DateTimeFormat>();
function parts(at: number, zone: string) {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(zone, formatter);
  }
  const values = Object.fromEntries(
    formatter.formatToParts(at).map((p) => [p.type, p.value]),
  );
  return {
    year: +values.year,
    month: +values.month,
    day: +values.day,
    hour: +values.hour,
    minute: +values.minute,
  };
}
function wall(at: number, zone: string) {
  const p = parts(at, zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
}
/** Convert at most two local dates, including DST gaps, without a minute-by-minute scan. */
export function nextEmailDate(
  zone: string,
  hour: number,
  minute: number,
  from = new Date(),
) {
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  )
    throw new Error("Elige una hora válida para el correo.");
  const p = parts(from.getTime(), zone);
  for (let day = 0; day < 2; day++) {
    const target = Date.UTC(p.year, p.month - 1, p.day + day, hour, minute);
    if (target <= Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute))
      continue;
    let candidate = target;
    for (let i = 0; i < 4; i++) {
      const offset = target - wall(candidate, zone);
      if (!offset) break;
      candidate += offset;
    }
    if (wall(candidate, zone) === target && candidate > from.getTime())
      return new Date(candidate);
    // A skipped DST hour is observed at the first existing quarter-hour afterwards.
    if (wall(candidate, zone) !== target) {
      for (
        let t = candidate - 3 * 3600000;
        t <= candidate + 3 * 3600000;
        t += 15 * 60000
      ) {
        const local = wall(t, zone);
        if (
          t > from.getTime() &&
          local >= target &&
          local < target + 3 * 3600000
        )
          return new Date(t);
      }
    }
  }
  throw new Error("No pudimos calcular el horario del correo.");
}
export interface EmailDraft {
  subject: string;
  lines: string[];
  categories: ("challenges" | "celebrations" | "adminMessages")[];
}
export function dailyEmailDraft(
  family: Family,
  prefs: EmailPreferences,
  summary: FamilySummary,
  levels: Level[],
  finished: string[],
  started: boolean,
  now = new Date(),
  custom: EmailSettings = defaultEmailSettings,
): EmailDraft | null {
  if (!prefs.enabled) return null;
  const lines: string[] = [],
    categories: EmailDraft["categories"] = [];
  if (prefs.celebrations) {
    const wedding = getAnnualEvent(family.marriageDate, family.timezone, now);
    if (wedding?.isToday)
      lines.push(
        renderEmailText(custom.anniversaryTemplate, { years: wedding.years }),
      );
    const today = localDateISO(family.timezone, now),
      year = Number(today.slice(0, 4));
    for (const person of [
      { name: family.partner1, date: family.partner1BirthDate },
      { name: family.partner2, date: family.partner2BirthDate },
      ...family.children.map((c) => ({ name: c.name, date: c.birthDate })),
    ])
      if (
        person.date &&
        isCalendarDate(person.date) &&
        person.date <= today &&
        (() => {
          const [, m, d] = person.date.split("-").map(Number),
            lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
          return (
            today.slice(5) ===
            `${String(m).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`
          );
        })()
      )
        lines.push(
          renderEmailText(custom.birthdayTemplate, { person: person.name }),
        );
    if (lines.length) categories.push("celebrations");
  }
  if (prefs.challenges && started) {
    const current = [...levels]
      .filter((l) => l.published)
      .sort((a, b) => a.order - b.order)
      .find(
        (l) =>
          !finished.includes(l.id) &&
          (!l.prerequisiteId || finished.includes(l.prerequisiteId)),
      );
    const last =
      typeof summary.lastCompletedAt === "string"
        ? Date.parse(summary.lastCompletedAt)
        : 0;
    if (current && (!last || now.getTime() >= last + 86400000)) {
      const n = summary.levelId === current.id ? summary.completedCount : 0,
        challenge = current.challenges[n];
      lines.push(
        challenge
          ? renderEmailText(custom.challengeTemplate, {
              level: current.order,
              challenge: challenge.title,
            })
          : renderEmailText(custom.finishTemplate, {
              levelTitle: current.title,
            }),
      );
      categories.push("challenges");
    }
  }
  return lines.length
    ? {
        subject: categories.includes("celebrations")
          ? "Hoy celebramos su historia ♡ · ENTRE DOS"
          : "Su momento en pareja ♡ · ENTRE DOS",
        lines,
        categories,
      }
    : null;
}
export const emailDay = (zone: string, now = new Date()) =>
  localDateISO(zone, now);
