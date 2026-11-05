import { getAnnualEvent } from "./anniversary";
import type { Family, FamilyPortraits, PublicBirthdayPerson } from "./types";
export const PERSON_PHOTO_LIMIT = 16000;
export function familyMembers(family: Family) {
  return [
    {
      key: "partner-1",
      index: 0,
      name: family.partner1,
      birthDate: family.partner1BirthDate,
      kind: "Integrante de la pareja",
    },
    {
      key: "partner-2",
      index: 1,
      name: family.partner2,
      birthDate: family.partner2BirthDate,
      kind: "Integrante de la pareja",
    },
    ...family.children.map((child, i) => ({
      key: child.id ?? `child-${i}`,
      index: i + 2,
      name: child.name,
      birthDate: child.birthDate,
      kind:
        child.kind === "hija"
          ? "Hija"
          : child.kind === "hijo"
            ? "Hijo"
            : "Integrante de la familia",
    })),
  ];
}
export function validatePortraits(
  people: FamilyPortraits,
  family: Family,
): FamilyPortraits {
  const allowed = new Set(familyMembers(family).map((p) => p.key));
  return Object.fromEntries(
    Object.entries(people)
      .filter(([key]) => allowed.has(key))
      .map(([key, p]) => {
        if (
          !p ||
          typeof p.shareBirthday !== "boolean" ||
          (p.dataUri !== null &&
            (typeof p.dataUri !== "string" ||
              p.dataUri.length > PERSON_PHOTO_LIMIT ||
              !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.dataUri)))
        )
          throw new Error(
            "La foto individual debe ser una miniatura JPEG de hasta 12 KB.",
          );
        return [key, { dataUri: p.dataUri, shareBirthday: p.shareBirthday }];
      }),
  );
}
export function publicBirthdayPeople(
  family: Family,
  people: FamilyPortraits,
): PublicBirthdayPerson[] {
  return familyMembers(family).flatMap((p) => {
    const photo = people[p.key];
    if (
      !photo?.shareBirthday ||
      !p.birthDate ||
      !getAnnualEvent(p.birthDate, family.timezone, new Date(), true)
    )
      return [];
    return [
      {
        key: p.key,
        index: p.index,
        name: p.name,
        monthDay: p.birthDate.slice(5),
        avatar: photo.dataUri,
      },
    ];
  });
}
export function upcomingCommunityBirthdays(
  people: PublicBirthdayPerson[],
  timezone: string,
  now = new Date(),
) {
  return people
    .flatMap((p) => {
      const event = getAnnualEvent(`2000-${p.monthDay}`, timezone, now, true);
      return event && event.daysRemaining <= 30
        ? [{ ...p, daysRemaining: event.daysRemaining, isToday: event.isToday }]
        : [];
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
