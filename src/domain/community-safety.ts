export const COMMUNITY_TERMS_VERSION = 1;
export const reportReasons = {
  inappropriate: "Foto o contenido inapropiado",
  harassment: "Acoso, insultos o amenazas",
  privacy: "Privacidad o falta de consentimiento",
  spam: "Publicidad o mensajes no deseados",
  other: "Otro motivo",
} as const;
export type ReportReason = keyof typeof reportReasons;
export type ModerationStatus = "private" | "pending" | "approved" | "removed";
export const communityRules = [
  "Compartan solo fotos y nombres con autorización de las personas que aparecen. Para menores, se necesita autorización de su responsable.",
  "No se permiten desnudos, contenido sexual, violencia, amenazas, discriminación, acoso ni insultos.",
  "No publiquen correos, teléfonos, direcciones ni datos privados de otras personas. No envíen publicidad ni enlaces de pago.",
  "Los perfiles y las fotos públicas pasan por revisión antes de aparecer. Podemos retirar contenido o suspender la participación en Comunidad.",
  "Pueden reportar perfiles y felicitaciones y bloquear familias. El bloqueo impide nuevas felicitaciones entre ambas cuentas.",
] as const;
export function acceptableCommunityText(text: string) {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  // An inexpensive first filter; photos and profile names also require human review.
  return !/(https?:\/\/|www\.|\b(?:porn(?:o|ography)?|nudes?|puta|puto|mierda|fuck|fucking|nigger|maricon|violarte|matarte)\b)/i.test(
    normalized,
  );
}
export function samePublicContent(
  a: { alias: string; avatar: string | null; people?: unknown[] },
  b: { alias: string; avatar: string | null; people?: unknown[] },
) {
  const stable = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object")
      return `{${Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
        .join(",")}}`;
    return JSON.stringify(value) ?? "null";
  };
  return (
    a.alias === b.alias &&
    a.avatar === b.avatar &&
    stable(a.people ?? []) === stable(b.people ?? [])
  );
}
