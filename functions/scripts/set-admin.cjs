const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
async function main() {
  const [target, mode] = process.argv.slice(2);
  if (
    !process.env.GCLOUD_PROJECT ||
    !target ||
    !["grant", "revoke"].includes(mode)
  )
    throw new Error(
      "Usa GCLOUD_PROJECT y set-admin.cjs <correo-o-uid> grant|revoke con credenciales del propietario.",
    );
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT,
  });
  const auth = getAuth(),
    user = target.includes("@")
      ? await auth.getUserByEmail(target)
      : await auth.getUser(target);
  if (user.disabled) throw new Error("La cuenta está deshabilitada.");
  const claims = { ...user.customClaims };
  if (mode === "grant") claims.admin = true;
  else delete claims.admin;
  await auth.setCustomUserClaims(user.uid, claims);
  await getFirestore()
    .collection("adminAudit")
    .add({
      actorUid: "owner-cli",
      target: user.uid,
      action: `admin.${mode}`,
      at: Timestamp.now(),
    });
  console.log(
    `Rol actualizado para ${user.uid}. Cierra sesión y vuelve a ingresar en la app para actualizar el acceso.`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
