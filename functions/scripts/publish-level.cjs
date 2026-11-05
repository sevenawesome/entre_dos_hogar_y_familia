const fs = require("node:fs");
const { isDeepStrictEqual } = require("node:util");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
async function main() {
  const filename = process.argv[2];
  if (!filename || !process.env.GCLOUD_PROJECT)
    throw new Error(
      "Usa GCLOUD_PROJECT y una ruta JSON. Autentícate con Application Default Credentials o GOOGLE_APPLICATION_CREDENTIALS.",
    );
  const level = JSON.parse(
    fs.readFileSync(filename, "utf8").replace(/^\uFEFF/, ""),
  );
  const id = (value) =>
    typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  const text = (value, max) =>
    typeof value === "string" && value.trim().length > 0 && value.length <= max;
  if (
    !id(level.id) ||
    !Number.isInteger(level.order) ||
    level.order < 1 ||
    !text(level.title, 100) ||
    !text(level.subtitle, 300) ||
    !text(level.description, 2000) ||
    typeof level.published !== "boolean" ||
    !(level.prerequisiteId === null || id(level.prerequisiteId))
  )
    throw new Error("Metadatos del nivel inválidos.");
  if (
    !Array.isArray(level.challenges) ||
    level.challenges.length < 1 ||
    level.challenges.length > 200 ||
    !Array.isArray(level.questions) ||
    level.questions.length < 1 ||
    level.questions.length > 30
  )
    throw new Error("Se necesitan 1–200 retos y 1–30 preguntas.");
  const seen = new Set();
  for (const [i, c] of level.challenges.entries()) {
    if (
      !id(c.id) ||
      seen.has(c.id) ||
      c.order !== i + 1 ||
      !text(c.title, 100) ||
      !text(c.description, 4000) ||
      !text(c.reflection, 1000) ||
      !text(c.stage, 100) ||
      !Number.isInteger(c.minutes) ||
      c.minutes < 1 ||
      c.minutes > 240
    )
      throw new Error(`Reto inválido en posición ${i + 1}`);
    seen.add(c.id);
  }
  seen.clear();
  for (const q of level.questions) {
    if (!id(q.id) || seen.has(q.id) || !text(q.label, 300))
      throw new Error("Pregunta inválida");
    seen.add(q.id);
  }
  if (Buffer.byteLength(JSON.stringify(level)) > 800000)
    throw new Error("El nivel supera el tamaño permitido.");
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT,
  });
  const db = getFirestore();
  level.questionIds = level.questions.map((q) => q.id);
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`levels/${level.id}`),
      existing = await tx.get(ref);
    if (existing.exists) {
      const { auditId, publishedAt, questionIds, ...original } =
        existing.data();
      const { questionIds: expectedIds, ...source } = level;
      if (isDeepStrictEqual(original, source)) {
        const reservation = await tx.get(db.doc(`levelOrders/${level.order}`));
        if (reservation.exists && reservation.data().levelId !== level.id)
          throw new Error("Orden reservado por otro nivel.");
        tx.update(ref, { questionIds: expectedIds });
        tx.set(db.doc(`levelOrders/${level.order}`), { levelId: level.id });
        return;
      }
      throw new Error(
        "No se sobrescribe un nivel existente: conserva los retos y publica una nueva versión con otro ID.",
      );
    }
    const sameOrder = await tx.get(
      db.collection("levels").where("order", "==", level.order),
    );
    if (!sameOrder.empty) throw new Error("Ya existe un nivel con ese orden.");
    if (level.order === 1 && level.prerequisiteId !== null)
      throw new Error("El primer nivel no puede tener prerrequisito.");
    if (level.order > 1 && !level.prerequisiteId)
      throw new Error("Un nivel posterior necesita un prerrequisito.");
    if (level.prerequisiteId) {
      const previous = await tx.get(db.doc(`levels/${level.prerequisiteId}`));
      if (
        !previous.exists ||
        !previous.data().published ||
        previous.data().order >= level.order
      )
        throw new Error(
          "El prerrequisito debe estar publicado y ser anterior.",
        );
    }
    tx.create(ref, level);
    tx.set(db.doc(`levelOrders/${level.order}`), { levelId: level.id });
  });
  console.log(
    `Nivel ${level.id} publicado en ${process.env.GCLOUD_PROJECT}: ${level.challenges.length} retos.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
