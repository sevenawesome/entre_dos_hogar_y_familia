export interface EmailSettings {
  version: number;
  paused: boolean;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  automaticEnabled: boolean;
  adminMessagesEnabled: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  subjectPrefix: string;
  birthdayTemplate: string;
  anniversaryTemplate: string;
  challengeTemplate: string;
  finishTemplate: string;
}
export const defaultEmailSettings: EmailSettings = {
  version: 0,
  paused: false,
  fromName: "ENTRE DOS",
  fromEmail: "",
  replyTo: "sevenawesome.srl@gmail.com",
  automaticEnabled: true,
  adminMessagesEnabled: true,
  dailyLimit: 90,
  monthlyLimit: 2700,
  subjectPrefix: "",
  birthdayTemplate:
    "¡Feliz cumpleaños, {person}! Hoy es un buen día para celebrar en familia.",
  anniversaryTemplate:
    "¡Feliz aniversario! Hoy celebran {years} años de matrimonio. Regálense un momento juntos.",
  challengeTemplate:
    "Su reto pendiente del nivel {level}: «{challenge}». Sigue esperándolos hasta que lo completen juntos. Abran ENTRE DOS para hacerlo y guardar su avance.",
  finishTemplate:
    "Ya compartieron todos los retos de «{levelTitle}». Respondan juntos la reflexión final en ENTRE DOS para conseguir su nivel.",
};
export function validateEmailSettings(value: unknown): EmailSettings {
  const input = value as EmailSettings;
  if (
    !input ||
    !Number.isInteger(input.version) ||
    input.version < 0 ||
    !Number.isInteger(input.dailyLimit) ||
    input.dailyLimit < 1 ||
    input.dailyLimit > 90 ||
    !Number.isInteger(input.monthlyLimit) ||
    input.monthlyLimit < 1 ||
    input.monthlyLimit > 2700
  )
    throw new Error(
      "Revisa los límites de correo: hasta 90 al día y 2700 al mes en esta configuración gratuita.",
    );
  for (const k of [
    "paused",
    "automaticEnabled",
    "adminMessagesEnabled",
  ] as const)
    if (typeof input[k] !== "boolean")
      throw new Error("Preferencia de correo inválida.");
  if (
    typeof input.fromName !== "string" ||
    !input.fromName.trim() ||
    input.fromName.length > 80 ||
    /[\r\n<>]/.test(input.fromName)
  )
    throw new Error("Revisa el nombre del remitente.");
  const email = (s: unknown) =>
    typeof s === "string" &&
    s.length <= 150 &&
    /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(s);
  if (input.fromEmail !== "" && !email(input.fromEmail))
    throw new Error("Revisa el correo del remitente.");
  if (!email(input.replyTo))
    throw new Error("Revisa el correo para respuestas.");
  if (
    typeof input.subjectPrefix !== "string" ||
    input.subjectPrefix.length > 40 ||
    /[\r\n]/.test(input.subjectPrefix)
  )
    throw new Error("El prefijo del asunto admite hasta 40 caracteres.");
  const variables = {
    birthdayTemplate: ["person"],
    anniversaryTemplate: ["years"],
    challengeTemplate: ["level", "challenge"],
    finishTemplate: ["levelTitle"],
  };
  for (const k of Object.keys(variables) as (keyof typeof variables)[]) {
    if (
      typeof input[k] !== "string" ||
      !input[k].trim() ||
      input[k].length > 800
    )
      throw new Error("Cada plantilla admite entre 1 y 800 caracteres.");
    if (
      [...input[k].matchAll(/\{([^}]+)\}/g)].some(
        (m) => !variables[k].includes(m[1]),
      )
    )
      throw new Error("Una plantilla contiene una variable desconocida.");
  }
  return Object.fromEntries(
    Object.keys(defaultEmailSettings).map((k) => [
      k,
      input[k as keyof EmailSettings],
    ]),
  ) as unknown as EmailSettings;
}
export const renderEmailText = (
  template: string,
  values: Record<string, string | number>,
) =>
  template.replace(/\{([a-zA-Z]+)\}/g, (all, key) =>
    key in values ? String(values[key]) : all,
  );
