const DAY = 86_400_000;
export function localDateISO(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1900 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
export function parseMarriageDate(
  input: string,
  timezone: string,
  now = new Date(),
): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  if (!match) return null;
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  return isCalendarDate(date) && date <= localDateISO(timezone, now)
    ? date
    : null;
}
export function displayMarriageDate(value?: string | null) {
  return value ? value.split("-").reverse().join("/") : "";
}
function anniversaryIn(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}
export interface Anniversary {
  currentYears: number;
  daysRemaining: number;
  years: number;
  isToday: boolean;
  nextDate: string;
  progress: number;
  key: string;
}
export function getAnnualEvent(
  marriageDate: string | null | undefined,
  timezone: string,
  now = new Date(),
  includeDayZero = false,
): Anniversary | null {
  if (!marriageDate || !isCalendarDate(marriageDate)) return null;
  const today = localDateISO(timezone, now);
  if (marriageDate > today) return null;
  const [weddingYear, month, day] = marriageDate.split("-").map(Number);
  let year = Number(today.slice(0, 4));
  let nextDate = anniversaryIn(year, month, day);
  if (nextDate < today || (year === weddingYear && !includeDayZero))
    nextDate = anniversaryIn(++year, month, day);
  const previous =
    year - 1 === weddingYear
      ? marriageDate
      : anniversaryIn(year - 1, month, day);
  const daysRemaining = Math.round(
    (Date.parse(nextDate) - Date.parse(today)) / DAY,
  );
  const interval = (Date.parse(nextDate) - Date.parse(previous)) / DAY;
  return {
    currentYears: Math.max(
      0,
      Number(today.slice(0, 4)) -
        weddingYear -
        (today < anniversaryIn(Number(today.slice(0, 4)), month, day) ? 1 : 0),
    ),
    daysRemaining,
    years: year - weddingYear,
    isToday: daysRemaining === 0,
    nextDate,
    progress: Math.min(
      100,
      Math.max(0, Math.round((1 - daysRemaining / interval) * 100)),
    ),
    key: `${marriageDate}:${nextDate}`,
  };
}
export function getAnniversary(
  marriageDate: string | null | undefined,
  timezone: string,
  now = new Date(),
) {
  return getAnnualEvent(marriageDate, timezone, now);
}
export function reminderContent({
  anniversary,
  lastAnniversaryKey,
  levelId,
  challengeTitle,
  challengeReady,
  birthdays = [],
  lastBirthdayKeys = [],
}: {
  anniversary: Anniversary | null;
  lastAnniversaryKey?: string;
  levelId?: string;
  challengeTitle?: string;
  challengeReady: boolean;
  birthdays?: { name: string; age: number; key: string }[];
  lastBirthdayKeys?: string[];
}) {
  const celebrate =
    anniversary?.isToday && anniversary.key !== lastAnniversaryKey;
  const dueBirthdays = birthdays.filter(
    (b) => !lastBirthdayKeys.includes(b.key),
  );
  if (!celebrate && !dueBirthdays.length && (!levelId || !challengeReady))
    return null;
  const daily =
    levelId && challengeReady
      ? challengeTitle
        ? `Su reto: ${challengeTitle}. Regálense un momento para conectar.`
        : "Han compartido todos los retos. Su reflexión final los espera."
      : "";
  const greetings = [
    celebrate
      ? `Hoy celebran ${anniversary.years} ${anniversary.years === 1 ? "año" : "años"} de matrimonio. ¡Sigan eligiéndose!`
      : "",
    ...dueBirthdays
      .slice(0, 3)
      .map(
        (b) =>
          `¡Feliz cumpleaños, ${b.name}! ${b.age === 0 ? "Hoy comienza una nueva vida." : `Hoy cumple ${b.age} ${b.age === 1 ? "año" : "años"}.`}`,
      ),
    dueBirthdays.length > 3
      ? `Y ${dueBirthdays.length - 3} cumpleaños más. Vean todos en la app.`
      : "",
    daily,
  ].filter(Boolean);
  return {
    title: celebrate
      ? "¡Feliz aniversario! ♡"
      : dueBirthdays.length
        ? "¡Hoy celebramos en familia! 🎂"
        : "Un momento para ustedes ♡",
    body: greetings.join(" "),
    data: {
      screen: "today",
      ...(levelId ? { levelId } : {}),
      ...(celebrate ? { occasion: "anniversary" } : {}),
      ...(!celebrate && dueBirthdays.length ? { occasion: "birthday" } : {}),
    },
    anniversaryKey: celebrate ? anniversary.key : null,
    birthdayKeys: dueBirthdays.map((b) => b.key),
  };
}
