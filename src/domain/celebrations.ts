import { getAnniversary } from "./anniversary";
import { getFamilyBirthdays } from "./birthdays";
import type { Family } from "./types";
const years = (n: number) => `${n} ${n === 1 ? "año" : "años"}`;
export function familyCelebrations(
  uid: string,
  family: Family,
  now = new Date(),
) {
  const anniversary = getAnniversary(family.marriageDate, family.timezone, now);
  return [
    ...(anniversary
      ? [
          {
            key: `${uid}-anniversary`,
            uid,
            family: family.name,
            days: anniversary.daysRemaining,
            kind: "Aniversario",
            current: `Actualmente: ${years(anniversary.currentYears)} de matrimonio.`,
            upcoming: anniversary.isToday
              ? `Hoy celebran ${years(anniversary.years)} de casados.`
              : `En su próximo aniversario cumplirán ${years(anniversary.years)} de casados.`,
          },
        ]
      : []),
    ...getFamilyBirthdays(family, now).map((b) => ({
      key: `${uid}-${b.key}`,
      uid,
      family: family.name,
      days: b.daysRemaining,
      kind: "Cumpleaños",
      current: `${b.name} · Actualmente: ${years(b.currentAge)}.`,
      upcoming: b.isToday
        ? `Hoy cumple ${years(b.nextAge)}.`
        : `En su próximo cumpleaños cumplirá ${years(b.nextAge)}.`,
    })),
  ];
}
