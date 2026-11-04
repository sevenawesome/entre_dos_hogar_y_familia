import { getAnnualEvent } from "./anniversary";
import type { Family } from "./types";
export function getFamilyBirthdays(family: Family, now = new Date()) {
  const members = [
    { id: "partner-1", name: family.partner1, date: family.partner1BirthDate },
    { id: "partner-2", name: family.partner2, date: family.partner2BirthDate },
    ...family.children.map((child, i) => ({
      id: child.id ?? `child-${i}`,
      name: child.name,
      date: child.birthDate,
    })),
  ];
  return members
    .flatMap((member) => {
      const event = getAnnualEvent(member.date, family.timezone, now, true);
      return event
        ? [
            {
              id: member.id,
              name: member.name,
              birthDate: member.date!,
              currentAge: event.currentYears,
              nextAge: event.years,
              daysRemaining: event.daysRemaining,
              isToday: event.isToday,
              nextDate: event.nextDate,
              progress: event.progress,
              key: `${member.id}:${event.key}`,
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        a.daysRemaining - b.daysRemaining || a.name.localeCompare(b.name),
    );
}
