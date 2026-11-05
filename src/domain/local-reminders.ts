import type { DevicePreferences, Family } from "./types";
import { getAnnualEvent } from "./anniversary";
export interface LocalReminder {
  title: string;
  body: string;
  date?: Date;
  daily?: boolean;
}
export function localReminderPlan(
  family: Family,
  prefs: DevicePreferences,
  hasPendingLevel: boolean,
  now = new Date(),
): LocalReminder[] {
  if (!prefs.enabled) return [];
  const plan: LocalReminder[] = hasPendingLevel
    ? [
        {
          daily: true,
          title: "Un momento para ustedes ♡",
          body: "Su historia se cuida un día a la vez. Abran ENTRE DOS para ver su reto y progreso.",
        },
      ]
    : [];
  const events = [
    {
      date: family.marriageDate,
      title: "¡Feliz aniversario! ♡",
      body: "Hoy celebran su historia de amor. Descubran sus bodas y regálense un momento juntos.",
    },
    {
      date: family.partner1BirthDate,
      title: "¡Hoy celebramos en familia! 🎂",
      body: `¡Feliz cumpleaños, ${family.partner1}!`,
    },
    {
      date: family.partner2BirthDate,
      title: "¡Hoy celebramos en familia! 🎂",
      body: `¡Feliz cumpleaños, ${family.partner2}!`,
    },
    ...family.children.map((c) => ({
      date: c.birthDate,
      title: "¡Hoy celebramos en familia! 🎂",
      body: `¡Feliz cumpleaños, ${c.name}!`,
    })),
  ];
  for (const event of events) {
    let cursor = now;
    for (let year = 0; year < 2; year++) {
      const next = getAnnualEvent(event.date, prefs.timezone, cursor, true);
      if (!next) break;
      const [y, m, d] = next.nextDate.split("-").map(Number);
      const date = new Date(y, m - 1, d, prefs.hour, prefs.minute, 0);
      if (date > now) plan.push({ title: event.title, body: event.body, date });
      cursor = new Date(y, m - 1, d + 1, 12, 0, 0);
    }
  }
  return plan;
}
