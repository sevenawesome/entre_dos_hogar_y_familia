interface Recipient {
  uid: string;
  email: string;
  family: { name: string; partner1: string; partner2: string };
}
const normalized = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
/** Match every word in any order, including names, family, email and UID. */
export function matchesRecipient(recipient: Recipient, search: string) {
  const text = normalized(
    `${recipient.family.name} ${recipient.family.partner1} ${recipient.family.partner2} ${recipient.email} ${recipient.uid}`,
  );
  return normalized(search)
    .trim()
    .split(/\s+/)
    .every((word) => text.includes(word));
}
