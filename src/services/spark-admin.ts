import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { validateSettings, defaultSettings } from "../domain/settings";
import {
  canEditPublishedLevel,
  validateFamilyProfile,
  validateLevel,
} from "../domain/admin-validation";
import type { Family, FamilySummary, Level } from "../domain/types";
import { bundledAnniversaries } from "../data/anniversaries";

async function requireAdmin() {
  if (!db || !auth?.currentUser)
    throw new Error("Inicia sesión como administrador.");
  const role = (await getDoc(doc(db, "roles", auth.currentUser.uid))).data()
    ?.role;
  if (role !== "owner" && role !== "admin")
    throw new Error("Esta cuenta no tiene permiso de administración.");
  return { database: db, actor: auth.currentUser.uid };
}
const auditData = (actorUid: string, action: string, target: string) => ({
  actorUid,
  action,
  target,
  at: serverTimestamp(),
});
export interface ManagedFamily {
  uid: string;
  email: string;
  family: Family;
  summary: FamilySummary | null;
  remindersPaused: boolean;
  role: "owner" | "admin" | "member";
}
export async function listManagedFamilies(after?: QueryDocumentSnapshot) {
  const { database } = await requireAdmin();
  const { startAfter } = await import("firebase/firestore");
  const page = await getDocs(
    query(
      collection(database, "families"),
      orderBy("name"),
      ...(after ? [startAfter(after)] : []),
      limit(20),
    ),
  );
  const rows = await Promise.all(
    page.docs.map(async (f) => {
      const [s, control, role] = await Promise.all([
        getDoc(doc(database, "tracking", f.id)),
        getDoc(doc(database, "familyControls", f.id)),
        getDoc(doc(database, "roles", f.id)),
      ]);
      return {
        uid: f.id,
        email: s.data()?.email ?? "",
        family: f.data() as Family,
        summary: s.exists() ? (s.data() as FamilySummary) : null,
        remindersPaused: control.data()?.remindersPaused === true,
        role: role.data()?.role ?? "member",
      } as ManagedFamily;
    }),
  );
  return { rows, cursor: page.docs.at(-1), hasMore: page.size === 20 };
}
export async function sendFamilyMessage(
  uid: string,
  title: string,
  body: string,
) {
  const { database, actor } = await requireAdmin();
  if (!title.trim() || title.length > 100 || !body.trim() || body.length > 1200)
    throw new Error("Escribe un título y un mensaje de hasta 1200 caracteres.");
  const messageRef = doc(collection(database, "families", uid, "inbox")),
    audit = doc(collection(database, "adminAudit"));
  const batch = writeBatch(database);
  batch.set(messageRef, {
    title: title.trim(),
    body: body.trim(),
    senderUid: actor,
    createdAt: serverTimestamp(),
    auditId: audit.id,
  });
  batch.set(audit, auditData(actor, "message.send", uid));
  await batch.commit();
}
export async function setAccountRole(uid: string, role: "admin" | "member") {
  const { database, actor } = await requireAdmin();
  if (uid === actor)
    throw new Error("No puedes cambiar tu propio permiso desde este panel.");
  const ref = doc(database, "roles", uid),
    audit = doc(collection(database, "adminAudit"));
  await runTransaction(database, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.data()?.role === "owner")
      throw new Error(
        "El permiso del propietario se administra fuera de la app.",
      );
    tx.set(ref, {
      role,
      updatedAt: serverTimestamp(),
      updatedBy: actor,
      auditId: audit.id,
    });
    tx.set(audit, auditData(actor, "role.update", uid));
  });
}
export async function adminRequest(
  name: string,
  input: unknown,
): Promise<unknown> {
  const { database, actor } = await requireAdmin();
  const data = input as Record<string, unknown>;
  if (name === "adminBootstrap") {
    const [settings, levels] = await Promise.all([
      getDoc(doc(database, "config", "app")),
      getDocs(
        query(collection(database, "levels"), orderBy("order"), limit(200)),
      ),
    ]);
    return {
      settings: { ...defaultSettings, ...settings.data() },
      levels: levels.docs.map((d) => ({ ...d.data(), id: d.id })),
    };
  }
  if (name === "adminLoadAnniversaries") {
    const ref = doc(database, "catalogs", "anniversaries"),
      audit = doc(collection(database, "adminAudit"));
    return runTransaction(database, async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists()) return { already: true };
      tx.set(ref, { ...bundledAnniversaries, auditId: audit.id });
      tx.set(audit, auditData(actor, "catalog.seed", "catalogs/anniversaries"));
      return { ok: true };
    });
  }
  if (name === "adminSaveSettings") {
    const settings = validateSettings(data.settings),
      ref = doc(database, "config", "app"),
      audit = doc(collection(database, "adminAudit"));
    return runTransaction(database, async (tx) => {
      const snap = await tx.get(ref),
        version = snap.data()?.version ?? 0;
      if (version !== settings.version)
        throw new Error("La configuración cambió. Recarga antes de guardar.");
      const saved = { ...settings, version: version + 1, auditId: audit.id };
      tx.set(ref, saved);
      tx.set(audit, auditData(actor, "app.settings.update", "config/app"));
      return saved;
    });
  }
  if (name === "adminSaveLevel") {
    const level = validateLevel(data.level),
      ref = doc(database, "levels", level.id),
      reservation = doc(database, "levelOrders", String(level.order)),
      audit = doc(collection(database, "adminAudit"));
    await runTransaction(database, async (tx) => {
      const [old, order, previous] = await Promise.all([
        tx.get(ref),
        tx.get(reservation),
        level.prerequisiteId
          ? tx.get(doc(database, "levels", level.prerequisiteId))
          : Promise.resolve(null),
      ]);
      if (
        old.data()?.published &&
        !canEditPublishedLevel(old.data() as Level, level)
      )
        throw new Error(
          "Un nivel publicado conserva sus retos, preguntas y recorrido.",
        );
      if (order.exists() && order.data().levelId !== level.id)
        throw new Error("Ya existe otro nivel con ese orden.");
      if (
        level.prerequisiteId &&
        (!previous?.data()?.published || previous.data()!.order >= level.order)
      )
        throw new Error(
          "El prerrequisito debe ser un nivel anterior y publicado.",
        );
      const publishedAt =
        old.data()?.publishedAt ??
        (level.published ? new Date().toISOString() : null);
      tx.set(reservation, { levelId: level.id });
      tx.set(ref, {
        ...level,
        questionIds: level.questions.map((q) => q.id),
        ...(publishedAt ? { publishedAt } : {}),
        auditId: audit.id,
      });
      tx.set(audit, auditData(actor, "level.save", level.id));
    });
    return { ok: true };
  }
  if (name === "adminFindFamily") {
    const value = String(data.query ?? "").trim();
    const summary = value.includes("@")
      ? (
          await getDocs(
            query(
              collection(database, "tracking"),
              where("email", "==", value),
              limit(1),
            ),
          )
        ).docs[0]
      : await getDoc(doc(database, "tracking", value));
    if (
      !summary ||
      !(typeof summary.exists === "function" ? summary.exists() : true)
    )
      throw new Error(
        "No encontramos esa familia. Debe completar su registro en la app.",
      );
    const uid = summary.id,
      [family, controls] = await Promise.all([
        getDoc(doc(database, "families", uid)),
        getDoc(doc(database, "familyControls", uid)),
      ]);
    if (!family.exists())
      throw new Error("La cuenta todavía no registró su familia.");
    const s = summary.data() as FamilySummary;
    return {
      uid,
      email: s.email,
      family: family.data(),
      remindersPaused: controls.data()?.remindersPaused === true,
      deviceCount: 0,
      progress: [
        {
          levelId: s.levelId || "Sin comenzar",
          completedCount: s.totalCompleted,
          finished: s.finishedCount > 0,
        },
      ],
    };
  }
  if (name === "adminUpdateFamily" || name === "adminSetFamilyReminders") {
    const uid = String(data.uid ?? ""),
      audit = doc(collection(database, "adminAudit"));
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) throw new Error("UID inválido.");
    const batch = writeBatch(database);
    if (name === "adminUpdateFamily") {
      const family = validateFamilyProfile(data.family as Family);
      batch.set(doc(database, "families", uid), {
        ...family,
        adminAuditId: audit.id,
      });
      batch.set(audit, auditData(actor, "family.profile.update", uid));
    } else {
      if (typeof data.paused !== "boolean") throw new Error("Pausa inválida.");
      batch.set(doc(database, "familyControls", uid), {
        remindersPaused: data.paused,
        auditId: audit.id,
      });
      batch.set(audit, auditData(actor, "family.reminders.update", uid));
    }
    await batch.commit();
    return { ok: true };
  }
  throw new Error("Esta acción no está disponible en el modo Spark.");
}
