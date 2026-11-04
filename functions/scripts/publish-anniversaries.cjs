const fs = require("node:fs");
const { isDeepStrictEqual } = require("node:util");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
async function main() {
  if (!process.env.GCLOUD_PROJECT || !process.argv[2])
    throw new Error("Indica GCLOUD_PROJECT y la ruta del catálogo JSON.");
  const data = JSON.parse(
    fs.readFileSync(process.argv[2], "utf8").replace(/^\uFEFF/, ""),
  );
  const text = (value, max) =>
    typeof value === "string" && value.trim() && value.length <= max;
  if (
    !Number.isInteger(data.version) ||
    data.version < 1 ||
    !text(data.tradition, 150) ||
    !text(data.note, 2000) ||
    !Array.isArray(data.milestones) ||
    !data.milestones.length ||
    data.milestones.length > 200 ||
    !Array.isArray(data.sources) ||
    !data.sources.length ||
    data.sources.length > 10
  )
    throw new Error("Metadatos del catálogo inválidos.");
  const years = new Set();
  for (const m of data.milestones) {
    if (
      !Number.isInteger(m.year) ||
      m.year < 1 ||
      m.year > 200 ||
      years.has(m.year) ||
      !text(m.material, 100) ||
      !text(m.meaning, 2000) ||
      !text(m.invitation, 1000)
    )
      throw new Error("Categoría inválida o año duplicado.");
    years.add(m.year);
  }
  for (const s of data.sources) {
    if (
      !text(s.title, 200) ||
      !text(s.url, 1000) ||
      new URL(s.url).protocol !== "https:"
    )
      throw new Error("Fuente inválida.");
  }
  if (Buffer.byteLength(JSON.stringify(data)) > 800000)
    throw new Error("El catálogo supera el tamaño permitido.");
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT,
  });
  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const ref = db.doc("catalogs/anniversaries"),
      previous = await tx.get(ref);
    if (previous.exists && isDeepStrictEqual(previous.data(), data)) return;
    if (previous.exists && previous.data().version >= data.version)
      throw new Error(
        "Incrementa version para actualizar el catálogo publicado.",
      );
    tx.set(ref, data);
  });
  console.log(
    `Catálogo de bodas v${data.version}: ${data.milestones.length} categorías publicadas.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
