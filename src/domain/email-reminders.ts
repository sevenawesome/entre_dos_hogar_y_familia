import {
  defaultEmailSettings,
  renderEmailText,
  type EmailSettings,
} from "./email-settings";
/** Delivery is managed by the team. A signed unsubscribe is never overridden by the app. */
export interface EmailPreferences {
  enabled: boolean;
  version: number;
  unsubscribed?: boolean;
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
export interface EmailDraft {
  subject: string;
  lines: string[];
  categories: ("welcome" | "levelCompleted" | "adminMessages")[];
}
export function eventEmailDraft(
  kind: "welcome" | "levelCompleted",
  family: string,
  levelTitle: string,
  settings: EmailSettings = defaultEmailSettings,
): EmailDraft | null {
  if (kind === "welcome")
    return settings.welcomeEnabled
      ? {
          subject: "Bienvenidos a Amor que permanece ♡",
          lines: [renderEmailText(settings.welcomeTemplate, { family })],
          categories: ["welcome"],
        }
      : null;
  if (
    kind !== "levelCompleted" ||
    !levelTitle.trim() ||
    !settings.completionEnabled
  )
    return null;
  return {
    subject: "¡Consiguieron un nuevo nivel! ♡ · Amor que permanece",
    lines: [
      renderEmailText(settings.completionTemplate, { family, levelTitle }),
    ],
    categories: ["levelCompleted"],
  };
}
