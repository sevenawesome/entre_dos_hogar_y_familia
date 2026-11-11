export interface MessageAttachment {
  name: string;
  mime: string;
  base64: string;
  size: number;
}
export const ATTACHMENT_LIMIT = 250 * 1024;
const types: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "text/plain": ["txt"],
};
export function validateAttachments(input: unknown): MessageAttachment[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 3)
    throw Error("Adjunta hasta 3 archivos, con un total máximo de 250 KB.");
  let total = 0;
  return input.map((v) => {
    if (
      !v ||
      typeof v.name !== "string" ||
      !v.name.trim() ||
      v.name.length > 100 ||
      /[\\/\r\n\x00-\x1f]/.test(v.name) ||
      typeof v.mime !== "string" ||
      !types[v.mime]?.includes(v.name.split(".").at(-1)?.toLowerCase()) ||
      typeof v.base64 !== "string" ||
      v.base64.length > Math.ceil(ATTACHMENT_LIMIT / 3) * 4 ||
      !v.base64.length ||
      v.base64.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(v.base64)
    )
      throw Error(
        "Adjunto inválido. Usa fotos JPG, PNG o WebP, documentos PDF o TXT.",
      );
    const bytes =
      (v.base64.length / 4) * 3 -
      (v.base64.endsWith("==") ? 2 : v.base64.endsWith("=") ? 1 : 0);
    if (bytes !== v.size || bytes < 1 || (total += bytes) > ATTACHMENT_LIMIT)
      throw Error(
        "Los adjuntos deben sumar como máximo 250 KB para conservar el almacenamiento gratuito.",
      );
    const magic =
      v.mime === "application/pdf"
        ? "JVBERi0"
        : v.mime === "image/jpeg"
          ? "/9j/"
          : v.mime === "image/png"
            ? "iVBORw0KGgo"
            : null;
    if (magic && !v.base64.startsWith(magic))
      throw Error("El contenido del archivo no coincide con su formato.");
    if (
      v.mime === "image/webp" &&
      (!v.base64.startsWith("UklGR") ||
        atob(v.base64.slice(0, 16)).slice(8, 12) !== "WEBP")
    )
      throw Error("La imagen WebP no es válida.");
    return { name: v.name, mime: v.mime, base64: v.base64, size: bytes };
  });
}
