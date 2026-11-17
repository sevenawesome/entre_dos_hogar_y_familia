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
const sourceHref = "source/family-demo.png";
const photoBox = (x, y, w, h, r = 20) => {
  const id = "photo" + ++clipSequence;
  return `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath></defs><image href="${sourceHref}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${id})"/>`;
};
let clipSequence = 0;
const faces = {
  lucia: [285, 470],
  daniel: [605, 285],
  carla: [995, 355],
  mateo: [1300, 555],
};
const face = (x, y, r, person) => {
  const [cx, cy] = faces[person],
    id = "face" + ++clipSequence,
    scale = (2 * r) / 430;
  return `<defs><clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath></defs><image href="${sourceHref}" x="${x - cx * scale}" y="${y - cy * scale}" width="${1536 * scale}" height="${1024 * scale}" clip-path="url(#${id})"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#FFF" stroke-width="3"/>`;
};
const birthdayRow = (y, person, name, age, next, when, progress) =>
  rect(100, y, 520, 106) +
  face(154, y + 52, 39, person) +
  text(212, y + 32, name, 25, c.navy, 700) +
  text(212, y + 64, `${age} años · cumple ${next}`, 23, c.wine, 700) +
  text(212, y + 92, when, 20, c.muted) +
  ring(568, y + 53, 27, progress, c.wine);
const views = [
  [
    "challenges",
    "HOY",
    0,
    photoBox(100, 135, 520, 220) +
      text(108, 395, "Familia Rivera", 29, c.navy, 700) +
      pill(414, 368, 205, "Nivel 1 · 20/30") +
      rect(100, 414, 520, 219, "#F7E8E8") +
      text(126, 451, "RETO 21 · UN MOMENTO JUNTOS", 18, c.wine, 700) +
      text(126, 490, "Escucharnos sin pantallas", 29, c.navy, 700) +
      text(126, 526, "15 minutos para estar presentes.", 22, c.muted) +
      rect(126, 551, 468, 54, c.wine, 16) +
      text(223, 587, "Lo hicimos juntos", 25, "#FFF", 700),
  ],
  [
    "levels",
    "CAMINO",
    1,
    face(151, 173, 37, "daniel") +
      face(218, 173, 37, "carla") +
      text(280, 166, "Familia Rivera", 28, c.navy, 700) +
      text(280, 201, "Cada paso cuenta", 22, c.muted) +
      rect(100, 236, 520, 141, "#F7ECD2") +
      text(126, 276, "NIVEL 1 · EN CAMINO", 20, c.ocean, 700) +
      text(126, 316, "Fortaleciendo nuestro amor", 27, c.navy, 700) +
      text(126, 352, "20 de 30 retos compartidos", 23, c.muted) +
      row(396, "Lo que ya construyeron", "Escucha, gratitud y tiempo juntos") +
      rect(100, 517, 520, 118, c.navy) +
      text(126, 557, "UNA NUEVA ETAPA POR DESCUBRIR", 19, "#E7BD61", 700) +
      text(126, 593, "Nivel 2 · crecer juntos", 27, "#FFF", 700) +
      text(126, 621, "Completen el nivel y su reflexión final", 20, "#D9E8ED"),
  ],
  [
    "family",
    "NOSOTROS",
    2,
    photoBox(100, 135, 520, 214) +
      text(108, 387, "Una familia, muchas historias", 29, c.navy, 700) +
      rect(100, 409, 520, 132, c.navy) +
      ring(174, 476, 43, 0.96, "#E7BD61", "11") +
      text(254, 449, "Bodas de acero", 28, "#FFF", 700) +
      text(254, 484, "11 años de matrimonio", 22, "#FFF") +
      text(254, 519, "Próximo: 12 años · seda", 22, "#E7BD61") +
      face(151, 589, 38, "daniel") +
      face(224, 589, 38, "carla") +
      text(289, 580, "Daniel y Carla", 25, c.navy, 700) +
      text(289, 614, "Lucía y Mateo, sus hijos", 21, c.muted),
  ],
  [
    "birthdays",
    "CUMPLEAÑOS",
    2,
    text(108, 159, "Cada persona tiene su día", 31, c.navy, 700) +
      birthdayRow(
        183,
        "lucia",
        "Lucía · hija",
        8,
        9,
        "En 3 días · 20 de noviembre",
        0.98,
      ) +
      birthdayRow(
        299,
        "mateo",
        "Mateo · hijo",
        6,
        7,
        "Mañana · 18 de noviembre",
        0.99,
      ) +
      birthdayRow(
        415,
        "daniel",
        "Daniel · papá",
        35,
        36,
        "29 de noviembre",
        0.96,
      ) +
      birthdayRow(
        531,
        "carla",
        "Carla · mamá",
        33,
        34,
        "8 de mayo · su próxima fecha",
        0.52,
      ),
  ],
  [
    "community",
    "COMUNIDAD",
    3,
    text(108, 158, "Un día para celebrar", 32, c.navy, 700) +
      rect(100, 186, 520, 257) +
      face(160, 246, 40, "daniel") +
      text(222, 231, "Familia Rivera", 28, c.navy, 700) +
      text(222, 268, "Hoy · bodas de acero", 22, c.muted) +
      ring(557, 250, 36, 1, c.gold, "11") +
      text(126, 326, "¡Feliz aniversario, Daniel y Carla!", 25, c.navy, 700) +
      rect(126, 362, 468, 53, "#F7E8E8", 16) +
      heart(210, 378, 22) +
      text(247, 396, "Enviar felicitación", 24, c.wine, 700) +
      rect(100, 466, 520, 166, "#E7F2F4") +
      text(126, 506, "UN RECUERDO PARA SIEMPRE", 19, c.ocean, 700) +
      text(126, 547, "“Que sigan creciendo juntos.”", 26, c.navy, 700) +
      text(126, 584, "Una felicitación por familia, guardada", 21, c.muted) +
      text(126, 614, "en los recuerdos de su aniversario.", 21, c.muted),
  ],
  [
    "reminders",
    "SUS AVISOS",
    0,
    rect(100, 137, 520, 132, c.navy) +
      heart(126, 160, 26, "#E7BD61") +
      text(171, 182, "AMOR QUE PERMANECE", 20, "#FFF", 700) +
      text(126, 225, "Su reto ya está disponible", 28, "#FFF", 700) +
      text(126, 254, "Tóquenlo para ir al reto pendiente", 21, "#D9E8ED") +
      rect(100, 290, 520, 143, "#F7E8E8") +
      face(156, 352, 40, "mateo") +
      text(215, 332, "¡Mañana cumple Mateo!", 25, c.wine, 700) +
      text(215, 369, "6 años hoy · 7 mañana", 24, c.navy, 700) +
      text(126, 410, "También les avisamos de su aniversario.", 22, c.muted) +
      row(
        453,
        "Una bandeja para su familia",
        "Mensajes, fotos, documentos y recuerdos",
      ) +
      text(
        111,
        596,
        "Correos de bienvenida, seguridad y logros",
        23,
        c.ocean,
        700,
      ) +
      text(
        111,
        630,
        "Su cuenta y sus avances, en los dos teléfonos",
        21,
        c.muted,
      ),
  ],
  [
    "administration",
    "ADMINISTRACIÓN",
    4,
    rect(100, 137, 520, 144, c.navy) +
      face(157, 199, 37, "carla") +
      text(217, 180, "Un equipo que acompaña", 27, "#FFF", 700) +
      text(217, 218, "24 familias activas · ejemplo", 21, "#D9E8ED") +
      text(126, 259, "Solo administradores autorizados", 20, "#E7BD61") +
      row(
        301,
        "Notificaciones a su bandeja",
        "Una familia o todas las familias",
      ) +
      row(
        417,
        "Correos personalizados",
        "Individuales o colectivos · dentro de cuota",
      ) +
      rect(100, 533, 520, 102, "#F7ECD2") +
      text(
        126,
        569,
        "Permisos · Niveles · Fechas · Seguimiento",
        22,
        c.navy,
        700,
      ) +
      text(
        126,
        605,
        "12/90 correos hoy · ajustes en un solo lugar",
        21,
        c.muted,
      ),
  ],
];
for (const [name, tab, active, content] of views) {
  const tabs = ["Hoy", "Camino", "Nosotros", "Comunidad", "Info"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="760" viewBox="0 0 720 760"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#F7ECD2"/><stop offset="1" stop-color="#DCEFF1"/></linearGradient></defs><rect width="720" height="760" rx="36" fill="url(#bg)"/><circle cx="674" cy="80" r="125" fill="#FFF" opacity=".35"/><circle cx="52" cy="690" r="115" fill="#9A3F50" opacity=".05"/>${rect(62, 37, 596, 688, "#06264A", 38)}${rect(69, 44, 582, 674, "#FBF7EE", 32)}${text(100, 99, tab, 20, c.ocean, 700)}${heart(586, 79, 26, c.gold)}${content}<path d="M94 655H626" stroke="#E5DFCF"/>${tabs.map((t, i) => `<circle cx="${134 + i * 113}" cy="678" r="${i === active ? 7 : 4}" fill="${i === active ? c.wine : "#A6B5B9"}"/>` + `<text x="${134 + i * 113}" y="703" font-family="Arial" font-size="15" text-anchor="middle" fill="${i === active ? c.wine : c.muted}" font-weight="${i === active ? 700 : 400}">${t}</text>`).join("")}</svg>`;
  await fs.writeFile(new URL(`${name}.svg`, out), svg);
  if (process.argv[2]) {
    const sharp = require(process.argv[2]);
    const photoData = await fs.readFile(new URL("source/family-demo.png", out));
    const rasterSvg = svg.replaceAll(
      `href="${sourceHref}"`,
      `href="data:image/png;base64,${photoData.toString("base64")}"`,
    );
    await sharp(Buffer.from(rasterSvg))
      .png({ palette: true })
      .toFile(
        new URL(`${name}.png`, out).pathname.replace(/^\/([A-Z]:)/i, "$1"),
      );
  }
}
console.log(
  `Created ${views.length} fictional product illustrations${process.argv[2] ? " and PNGs" : " (SVG)"}.`,
);
