// Static, fictional product illustrations. Optionally pass a locally available
// sharp module path to render PNGs; the committed PNGs need no runtime renderer.
import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const out = new URL("../assets/tour/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const c = {
  navy: "#06264A",
  gold: "#C79527",
  wine: "#9A3F50",
  ocean: "#1D6075",
  muted: "#596C79",
};
const escape = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const text = (x, y, value, size = 25, fill = c.navy, weight = 400) =>
  `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(value)}</text>`;
const rect = (x, y, w, h, fill = "#FFF", r = 24) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const ring = (x, y, r, progress, color = c.gold, label = "") =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-opacity=".18" stroke-width="12"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * r * progress} ${2 * Math.PI * r}" transform="rotate(-90 ${x} ${y})"/>${label ? `<text x="${x}" y="${y + 9}" font-family="Arial" font-size="30" font-weight="700" text-anchor="middle" fill="${color}">${escape(label)}</text>` : ""}`;
const heart = (x, y, size = 28, fill = c.wine) =>
  `<path d="M16 28C10 22 1 16 1 9C1 0 12-2 16 5C20-2 31 0 31 9C31 16 22 22 16 28Z" fill="${fill}" transform="translate(${x} ${y}) scale(${size / 32})"/>`;
const pill = (x, y, w, label, fill = "#F7ECD2", ink = c.navy) =>
  rect(x, y, w, 36, fill, 18) + text(x + 16, y + 25, label, 19, ink, 700);
const avatar = (x, y, label, fill = "#E7F2F4", size = 32) =>
  `<circle cx="${x}" cy="${y}" r="${size}" fill="${fill}"/>` +
  `<text x="${x}" y="${y + 8}" font-family="Arial" font-size="23" font-weight="700" text-anchor="middle" fill="${c.ocean}">${label}</text>`;
const row = (y, title, sub, tag = "") =>
  rect(100, y, 520, 100) +
  text(128, y + 37, title, 25, c.navy, 700) +
  text(128, y + 71, sub, 21, c.muted) +
  (tag ? pill(492, y + 30, 102, tag) : "");
const views = [
  [
    "challenges",
    "HOY",
    0,
    rect(100, 138, 520, 172, c.navy) +
      pill(125, 158, 178, "NIVEL 1", "#244563", "#FFF") +
      text(125, 228, "Un día a la vez.", 31, "#FFF", 700) +
      text(125, 271, "20 de 30 retos", 23, "#E7F2F4") +
      ring(542, 227, 52, 0.67, "#E7BD61", "67%") +
      rect(100, 332, 520, 254, "#F7E8E8") +
      heart(127, 356) +
      text(174, 379, "SU RETO DE HOY", 19, c.wine, 700) +
      text(126, 433, "Un momento para", 32, c.navy, 700) +
      text(126, 472, "escucharnos", 32, c.navy, 700) +
      rect(126, 505, 468, 54, c.wine, 16) +
      text(223, 540, "Lo hicimos juntos", 25, "#FFF", 700) +
      text(134, 628, "Su siguiente reto, un día después.", 22, c.muted),
  ],
  [
    "levels",
    "CAMINO",
    1,
    text(108, 163, "Cada paso cuenta", 34, c.navy, 700) +
      rect(100, 190, 520, 128, "#F7ECD2") +
      text(126, 232, "NIVEL 1 · EN CAMINO", 20, c.ocean, 700) +
      text(126, 277, "Fortaleciendo nuestro amor", 28, c.navy, 700) +
      `<path d="M148 350V506" stroke="#E5DFCF" stroke-width="7"/>` +
      avatar(148, 363, "✓", "#E5F2EE", 23) +
      text(192, 372, "Retos compartidos", 27, c.navy, 700) +
      avatar(148, 435, "✓", "#E5F2EE", 23) +
      text(192, 444, "Reflexión final", 27, c.navy, 700) +
      avatar(148, 507, "★", "#F7ECD2", 23) +
      text(192, 516, "Un logro para los dos", 27, c.navy, 700) +
      rect(100, 550, 520, 90, c.navy) +
      text(126, 586, "¡NUEVO NIVEL DISPONIBLE!", 21, "#E7BD61", 700) +
      text(126, 619, "Descubran su próxima etapa", 25, "#FFF"),
  ],
  [
    "family",
    "NOSOTROS",
    2,
    text(108, 159, "Su historia merece celebrarse", 29, c.navy, 700) +
      rect(100, 184, 520, 236, c.navy) +
      ring(204, 280, 61, 0.92, "#E7BD61", "12") +
      text(311, 242, "AÑOS JUNTOS", 20, "#E7BD61", 700) +
      text(311, 282, "Bodas de seda", 29, "#FFF", 700) +
      text(311, 324, "Próximamente: 13 años", 21, "#FFF") +
      text(134, 391, "Su aniversario está cada vez más cerca", 22, "#FFF") +
      rect(100, 444, 520, 184) +
      avatar(152, 498, "L", "#F7E8E8") +
      text(204, 493, "¡Se acerca su cumpleaños!", 25, c.navy, 700) +
      text(204, 528, "Lucía · cumple 8 años", 24, c.muted) +
      rect(127, 560, 466, 14, "#E7F2F4", 7) +
      rect(127, 560, 407, 14, c.ocean, 7) +
      text(128, 609, "Fotos y fechas de cada integrante", 22, c.muted),
  ],
  [
    "community",
    "COMUNIDAD",
    3,
    text(108, 160, "Celebren en comunidad", 32, c.navy, 700) +
      rect(100, 190, 520, 236) +
      avatar(162, 249, "R", "#F7ECD2", 39) +
      text(222, 238, "Familia Rivera", 29, c.navy, 700) +
      text(222, 272, "Hoy · bodas de cristal", 23, c.muted) +
      ring(538, 260, 43, 1, c.gold, "15") +
      text(128, 330, "15 años construyendo su historia", 24, c.navy) +
      rect(126, 355, 468, 48, "#F7E8E8", 15) +
      heart(218, 369, 22) +
      text(253, 388, "Enviar felicitación", 24, c.wine, 700) +
      rect(100, 451, 520, 174, "#E7F2F4") +
      text(126, 492, "UN RECUERDO PARA SIEMPRE", 18, c.ocean, 700) +
      text(126, 537, "“Que sigan creciendo juntos.”", 27, c.navy, 700) +
      text(126, 578, "Una felicitación por familia", 23, c.muted) +
      text(126, 610, "guardada en su aniversario.", 23, c.muted),
  ],
  [
    "reminders",
    "SUS AVISOS",
    0,
    rect(100, 138, 520, 151, c.navy) +
      heart(126, 164, 27, "#E7BD61") +
      text(170, 186, "AMOR QUE PERMANECE", 20, "#FFF", 700) +
      text(126, 231, "Su reto ya está disponible", 28, "#FFF", 700) +
      text(126, 268, "Tóquenlo para volver a su reto", 22, "#D9E8ED") +
      row(312, "Recordatorios a su ritmo", "En los dos teléfonos") +
      row(431, "Su bandeja familiar", "Mensajes, fotos y documentos") +
      rect(100, 550, 520, 88, "#F7ECD2") +
      text(126, 586, "CORREOS QUE ACOMPAÑAN", 19, c.ocean, 700) +
      text(126, 619, "Bienvenida, logros y mensajes del equipo", 21, c.navy),
  ],
  [
    "administration",
    "ADMINISTRACIÓN",
    4,
    rect(100, 138, 520, 129, c.navy) +
      text(126, 179, "Un espacio para acompañar", 29, "#FFF", 700) +
      text(126, 217, "Familias · Fechas · Seguimiento", 22, "#D9E8ED") +
      text(126, 248, "Solo administradores autorizados", 19, "#E7BD61") +
      row(289, "Cada persona, su permiso", "Decide qué puede ver y usar") +
      row(406, "Notificaciones y correos", "Herramientas separadas") +
      row(
        523,
        "Crear y publicar niveles",
        "Formulario, vista previa y confirmación",
      ),
  ],
];
for (const [name, tab, active, content] of views) {
  const tabs = ["Hoy", "Camino", "Nosotros", "Comunidad", "Info"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="760" viewBox="0 0 720 760"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#F7ECD2"/><stop offset="1" stop-color="#DCEFF1"/></linearGradient></defs><rect width="720" height="760" rx="36" fill="url(#bg)"/><circle cx="674" cy="80" r="125" fill="#FFF" opacity=".35"/><circle cx="52" cy="690" r="115" fill="#9A3F50" opacity=".05"/>${rect(62, 37, 596, 688, "#06264A", 38)}${rect(69, 44, 582, 674, "#FBF7EE", 32)}${text(100, 99, tab, 20, c.ocean, 700)}${heart(586, 79, 26, c.gold)}${content}<path d="M94 655H626" stroke="#E5DFCF"/>${tabs.map((t, i) => `<circle cx="${134 + i * 113}" cy="678" r="${i === active ? 7 : 4}" fill="${i === active ? c.wine : "#A6B5B9"}"/>` + `<text x="${134 + i * 113}" y="703" font-family="Arial" font-size="15" text-anchor="middle" fill="${i === active ? c.wine : c.muted}" font-weight="${i === active ? 700 : 400}">${t}</text>`).join("")}</svg>`;
  await fs.writeFile(new URL(`${name}.svg`, out), svg);
  if (process.argv[2]) {
    const sharp = require(process.argv[2]);
    await sharp(Buffer.from(svg))
      .png({ palette: true })
      .toFile(
        new URL(`${name}.png`, out).pathname.replace(/^\/([A-Z]:)/i, "$1"),
      );
  }
}
console.log(
  `Created ${views.length} fictional product illustrations${process.argv[2] ? " and PNGs" : " (SVG)"}.`,
);
