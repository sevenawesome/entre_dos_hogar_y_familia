import defaults from "../../content/app-settings.json";
import type { AppSettings } from "./types";
export const defaultSettings: AppSettings = defaults;
export function validateSettings(input: unknown): AppSettings {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Configuración inválida.");
  const data = input as Record<string, unknown>;
  const text = (key: string, limit: number, required = false) => {
    const v = data[key];
    if (typeof v !== "string" || v.length > limit || (required && !v.trim()))
      throw new Error(`Revisa ${key}.`);
    return v.trim();
  };
  const settings: AppSettings = {
    version:
      Number.isInteger(data.version) && Number(data.version) >= 0
        ? Number(data.version)
        : 0,
    announcement: text("announcement", 800),
    endTitle: text("endTitle", 100, true),
    endMessage: text("endMessage", 1200, true),
    newLevelTitle: text("newLevelTitle", 100, true),
    supportEmail: text("supportEmail", 150),
    supportUrl: text("supportUrl", 1000),
    notificationsEnabled: data.notificationsEnabled as boolean,
  };
  if (typeof settings.notificationsEnabled !== "boolean")
    throw new Error("Revisa la configuración de notificaciones.");
  if (
    settings.supportEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail)
  )
    throw new Error("Correo de soporte inválido.");
  if (settings.supportUrl && new URL(settings.supportUrl).protocol !== "https:")
    throw new Error("El enlace de soporte debe usar HTTPS.");
  return settings;
}
