export interface BrandingSettings {
  version: number;
  byline: string;
}
export const defaultBranding: BrandingSettings = {
  version: 0,
  byline: "By Departamento de Hogar y Familia",
};
export function validateBranding(value: BrandingSettings): BrandingSettings {
  if (
    !value ||
    !Number.isInteger(value.version) ||
    value.version < 0 ||
    typeof value.byline !== "string" ||
    value.byline.length > 120 ||
    /[\r\n]/.test(value.byline)
  )
    throw new Error(
      "El texto bajo el logo admite hasta 120 caracteres en una sola línea.",
    );
  return { version: value.version, byline: value.byline.trim() };
}
