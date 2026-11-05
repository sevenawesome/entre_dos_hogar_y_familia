const fs = require("node:fs");
const path = require("node:path");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
async function main() {
  if (!process.env.GCLOUD_PROJECT) throw new Error("Indica GCLOUD_PROJECT.");
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT,
  });
  const settings = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../../content/app-settings.json"),
      "utf8",
    ),
  );
  await getFirestore().runTransaction(async (tx) => {
    const ref = getFirestore().doc("config/app");
    const snap = await tx.get(ref);
    if (!snap.exists) tx.create(ref, { ...settings, version: 1 });
  });
  console.log(
    "Configuración inicial preparada; se conservaron los cambios existentes.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
