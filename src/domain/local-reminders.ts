import type { DevicePreferences, Family } from "./types";
import { getAnnualEvent } from "./anniversary";
export interface LocalReminder {
  title: string;
  body: string;
  date?: Date;
  daily?: boolean;
  anniversaryKey?: string;
}
export interface PendingChallengeReminder {
  order: number;
  title: string;
  availableAt: string | null;
}
export function localReminderPlan(
  family: Family,
  prefs: DevicePreferences,
  hasPendingLevel: boolean,
  now = new Date(),
  challenge?: PendingChallengeReminder,
): LocalReminder[] {
  if (!prefs.enabled) return [];
  const available = challenge?.availableAt
    ? new Date(challenge.availableAt)
    : null;
  const waiting = available && available > now;
  const challengeBody = challenge
    ? waiting
      ? `Su próximo reto: «${challenge.title}». Disponible a partir del ${new Intl.DateTimeFormat("es", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: prefs.timezone }).format(available)}. Abran Amor que permanece para verlo.`
      : `Su reto pendiente: «${challenge.title}». Háganlo juntos y marquen «Lo hicimos juntos» al terminar. Seguirá esperándolos hasta que lo completen.`
    : "Su historia se cuida un día a la vez. Abran Amor que permanece para ver su reto y progreso.";
  const plan: LocalReminder[] = hasPendingLevel
    ? [
        {
          daily: true,
          title: challenge
            ? `Reto ${challenge.order} · Un momento para ustedes ♡`
            : "Un momento para ustedes ♡",
          body: challengeBody,
        },
      ]
    : [];
  const events = [
    {
      date: family.marriageDate,
      anniversary: true,
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
      if (
        date > now ||
        ("anniversary" in event && next.isToday && next.years > 0)
      )
        plan.push({
          title: event.title,
          body:
            "anniversary" in event
              ? `Hoy celebran ${next.years} ${next.years === 1 ? "año" : "años"} de matrimonio. ¡Feliz aniversario! Su comunidad puede dejarles una felicitación para recordar.`
              : event.body,
          date: date > now ? date : new Date(now.getTime() + 1500),
          ...("anniversary" in event ? { anniversaryKey: next.key } : {}),
        });
      cursor = new Date(y, m - 1, d + 1, 12, 0, 0);
    }
  }
  return plan;
}
