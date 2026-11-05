import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  onCall,
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {
  hasAdminClaim,
  validateFamilyProfile,
  validateLevel,
  canEditPublishedLevel,
} from "../../src/domain/admin-validation";
import { defaultSettings, validateSettings } from "../../src/domain/settings";
import type { Level, Family } from "../../src/domain/types";
const region = "us-central1";
async function requireAdmin(request: CallableRequest) {
  if (!request.auth)
    throw new HttpsError(
      "unauthenticated",
      "Inicia sesión como administrador.",
    );
  if (!hasAdminClaim(request.auth.token))
    throw new HttpsError(
      "permission-denied",
      "Esta función requiere acceso de administrador.",
    );
  const current = await getAuth().getUser(request.auth.uid);
  if (current.disabled || !hasAdminClaim(current.customClaims))
    throw new HttpsError(
      "permission-denied",
      "El acceso de administrador ya no está activo.",
    );
  return request.auth.uid;
}
function targetId(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value))
    throw new HttpsError(
      "invalid-argument",
      "Identificador de usuario inválido.",
    );
  return value;
}
function input<T>(run: () => T): T {
  try {
    return run();
  } catch (e) {
    throw new HttpsError(
      "invalid-argument",
      e instanceof Error ? e.message : "Revisa los datos.",
    );
  }
}
const audit = (actorUid: string, action: string, target: string) => ({
  actorUid,
  action,
  target,
  at: Timestamp.now(),
});
export const adminBootstrap = onCall({ region }, async (request) => {
  await requireAdmin(request);
  const db = getFirestore();
  const [settings, levels] = await Promise.all([
    db.doc("config/app").get(),
    db.collection("levels").orderBy("order").limit(200).get(),
  ]);
  return {
    settings: settings.exists
      ? { ...defaultSettings, ...settings.data() }
      : defaultSettings,
    levels: levels.docs.map((d) => ({ ...d.data(), id: d.id })),
  };
});
export const adminSaveSettings = onCall({ region }, async (request) => {
  const actor = await requireAdmin(request);
  const settings = input(() => validateSettings(request.data?.settings));
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    const ref = db.doc("config/app"),
      snap = await tx.get(ref);
    const version = Number(snap.data()?.version ?? 0);
    if (version !== settings.version)
      throw new HttpsError(
        "failed-precondition",
        "La configuración cambió. Recarga antes de guardar para conservar los cambios del otro administrador.",
      );
    const saved = { ...settings, version: version + 1 };
    tx.set(ref, saved);
    tx.set(
      db.collection("adminAudit").doc(),
      audit(actor, "app.settings.update", "config/app"),
    );
    return saved;
  });
});
export const adminSaveLevel = onCall({ region }, async (request) => {
  const actor = await requireAdmin(request);
  const level = input(() => validateLevel(request.data?.level));
  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`levels/${level.id}`),
      existing = await tx.get(ref);
    if (
      existing.data()?.published &&
      !canEditPublishedLevel(existing.data() as Level, level)
    )
      throw new HttpsError(
        "failed-precondition",
        "Un nivel publicado conserva sus retos, preguntas, orden y prerrequisito. Crea otro nivel para cambiar su recorrido.",
      );
    const sameOrder = await tx.get(
      db.collection("levels").where("order", "==", level.order),
    );
    if (sameOrder.docs.some((d) => d.id !== level.id))
      throw new HttpsError(
        "already-exists",
        "Ya existe un nivel con ese orden.",
      );
    if (level.prerequisiteId) {
      const previous = await tx.get(db.doc(`levels/${level.prerequisiteId}`));
      if (!previous.data()?.published || previous.data()!.order >= level.order)
        throw new HttpsError(
          "failed-precondition",
          "El prerrequisito debe ser un nivel anterior y publicado.",
        );
    }
    const publishedAt =
      existing.data()?.publishedAt ??
      (level.published ? new Date().toISOString() : null);
    tx.set(ref, { ...level, ...(publishedAt ? { publishedAt } : {}) });
    tx.set(
      db.collection("adminAudit").doc(),
      audit(
        actor,
        level.published ? "level.publish" : "level.draft.save",
        level.id,
      ),
    );
  });
  return { ok: true };
});
export const adminFindFamily = onCall({ region }, async (request) => {
  const actor = await requireAdmin(request);
  const query = request.data?.query;
  if (typeof query !== "string" || !query.trim() || query.length > 150)
    throw new HttpsError(
      "invalid-argument",
      "Escribe el correo o UID de la cuenta.",
    );
  let user;
  try {
    user = query.includes("@")
      ? await getAuth().getUserByEmail(query.trim())
      : await getAuth().getUser(targetId(query.trim()));
  } catch {
    throw new HttpsError(
      "not-found",
      "No encontramos esa cuenta. La persona debe registrarse primero en la app.",
    );
  }
  const uid = targetId(user.uid),
    db = getFirestore();
  const [family, progress, devices, controls] = await Promise.all([
    db.doc(`families/${uid}`).get(),
    db.collection(`families/${uid}/progress`).get(),
    db.collection(`families/${uid}/devices`).get(),
    db.doc(`familyControls/${uid}`).get(),
  ]);
  await db.collection("adminAudit").add(audit(actor, "family.lookup", uid));
  return {
    uid,
    email: user.email ?? "",
    family: family.exists ? family.data() : null,
    remindersPaused: controls.data()?.remindersPaused === true,
    deviceCount: devices.size,
    progress: progress.docs.map((d) => ({
      levelId: d.id,
      completedCount: d.data().completions?.length ?? 0,
      finished: !!d.data().finishedAt,
    })),
  };
});
export const adminUpdateFamily = onCall({ region }, async (request) => {
  const actor = await requireAdmin(request),
    uid = targetId(request.data?.uid);
  const family = input(() =>
    validateFamilyProfile(request.data?.family as Family),
  );
  const db = getFirestore();
  await getAuth().getUser(uid);
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`families/${uid}`),
      [existing, deletion] = await tx.getAll(
        ref,
        db.doc(`deletedAccounts/${uid}`),
      );
    if (deletion.exists)
      throw new HttpsError(
        "failed-precondition",
        "La cuenta está siendo eliminada.",
      );
    if (existing.exists && existing.data()?.timezone !== family.timezone)
      throw new HttpsError(
        "failed-precondition",
        "La zona horaria original se conserva para proteger el avance diario.",
      );
    tx.set(ref, family);
    tx.set(
      db.collection("adminAudit").doc(),
      audit(actor, "family.profile.update", uid),
    );
  });
  return { ok: true };
});
export const adminSetFamilyReminders = onCall({ region }, async (request) => {
  const actor = await requireAdmin(request),
    uid = targetId(request.data?.uid);
  const paused = request.data?.paused;
  if (typeof paused !== "boolean")
    throw new HttpsError(
      "invalid-argument",
      "Selecciona si deseas pausar los avisos.",
    );
  await getAuth().getUser(uid);
  const db = getFirestore(),
    batch = db.batch();
  batch.set(
    db.doc(`familyControls/${uid}`),
    { remindersPaused: paused },
    { merge: true },
  );
  batch.set(
    db.collection("adminAudit").doc(),
    audit(
      actor,
      paused ? "family.reminders.pause" : "family.reminders.resume",
      uid,
    ),
  );
  await batch.commit();
  return { ok: true };
});
