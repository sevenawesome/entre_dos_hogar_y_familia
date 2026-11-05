const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
async function main() {
  const [target, mode] = process.argv.slice(2);
  if (
    !process.env.GCLOUD_PROJECT ||
    !target ||
    !["owner", "grant", "revoke"].includes(mode)
  )
    throw new Error(
      "Usa GCLOUD_PROJECT y set-admin.cjs <correo-o-uid> owner|grant|revoke con credenciales del propietario.",
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
  const db = getFirestore(),
    ref = db.doc(`roles/${user.uid}`);
  const role =
    mode === "owner" ? "owner" : mode === "grant" ? "admin" : "member";
  await db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (current.data()?.role === "owner" && mode !== "owner")
      throw new Error(
        "Transfiere el propietario explícitamente desde la consola antes de retirarlo.",
      );
    const audit = db.collection("adminAudit").doc();
    tx.set(ref, {
      role,
      updatedAt: Timestamp.now(),
      updatedBy: "owner-cli",
      auditId: audit.id,
    });
    tx.set(audit, {
      actorUid: "owner-cli",
      target: user.uid,
      action: `role.${mode}`,
      at: Timestamp.now(),
    });
  });
  // Remove legacy claims: current app/rules use the Firestore role and immediate revocation.
  if (user.customClaims?.admin) {
    const claims = { ...user.customClaims };
    delete claims.admin;
    await auth.setCustomUserClaims(user.uid, claims);
  }
  console.log(
    `Rol ${role} actualizado para ${user.uid}. La app recibe el permiso desde Firestore.`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
