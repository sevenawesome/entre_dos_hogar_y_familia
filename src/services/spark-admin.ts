import {
  validateEmailSettings,
  type EmailSettings,
} from "../domain/email-settings";
import {
  hasPermission,
  normalizePermissions,
  effectivePermissions,
  type AdminPermission,
} from "../domain/admin-permissions";
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

async function requireAdmin(permission?: AdminPermission) {
  if (!db || !auth?.currentUser)
    throw new Error("Inicia sesión como administrador.");
  const permissionData =
    (await getDoc(doc(db, "roles", auth.currentUser.uid))).data() ?? {};
  if (permissionData.role !== "owner" && permissionData.role !== "admin")
    throw new Error("Esta cuenta no tiene acceso administrativo.");
  if (permission && !hasPermission(permissionData, permission))
    throw new Error("Tu cuenta no tiene permiso para esta sección.");
  return { database: db, actor: auth.currentUser.uid, permissionData };
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
  permissions?: AdminPermission[];
}
export async function listManagedFamilies(after?: QueryDocumentSnapshot) {
  const { database, permissionData } = await requireAdmin("families.view");
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
      const [s, control, role, journey] = await Promise.all([
        getDoc(doc(database, "tracking", f.id)),
        getDoc(doc(database, "familyControls", f.id)),
        hasPermission(permissionData, "roles.manage")
          ? getDoc(doc(database, "roles", f.id))
          : Promise.resolve(null),
        getDoc(doc(database, "journeys", f.id)),
      ]);
      return {
        uid: f.id,
        email: s.data()?.email ?? "",
        family: f.data() as Family,
        summary: s.exists()
          ? ({
              ...s.data(),
              startedAt:
                journey.data()?.startedAt ??
                (s.data().totalCompleted > 0 ? undefined : null),
            } as FamilySummary)
          : null,
        remindersPaused: control.data()?.remindersPaused === true,
        role: role?.data()?.role ?? "member",
        permissions: effectivePermissions(role?.data() ?? { role: "member" }),
      } as ManagedFamily;
    }),
  );
  return { rows, cursor: page.docs.at(-1), hasMore: page.size === 20 };
}
function validateMessage(title: string, body: string) {
  if (!title.trim() || title.length > 100 || !body.trim() || body.length > 1200)
    throw new Error("Escribe un título y un mensaje de hasta 1200 caracteres.");
}
export async function sendFamilyMessage(
  uid: string,
  title: string,
  body: string,
) {
  const { database, actor } = await requireAdmin("messages.send");
  validateMessage(title, body);
  const ref = doc(collection(database, "families", uid, "inbox")),
    audit = doc(collection(database, "adminAudit")),
    batch = writeBatch(database);
  batch.set(ref, {
    title: title.trim(),
    body: body.trim(),
    senderUid: actor,
    createdAt: serverTimestamp(),
    auditId: audit.id,
  });
  batch.set(audit, auditData(actor, "message.send", uid));
  await batch.commit();
}
export async function familyEmailStatus(uid: string) {
  const { database } = await requireAdmin("emails.send");
  const pref = (await getDoc(doc(database, "emailPreferences", uid))).data();
  return {
    enabled: pref?.enabled !== false,
    unsubscribed: pref?.unsubscribed === true,
  };
}
export async function setFamilyEmailDelivery(uid: string, enabled: boolean) {
  const { database, actor } = await requireAdmin("emails.send"),
    ref = doc(database, "emailPreferences", uid),
    audit = doc(collection(database, "adminAudit"));
  await runTransaction(database, async (tx) => {
    const old = await tx.get(ref);
    if (enabled && old.data()?.unsubscribed)
      throw new Error(
        "Esta familia solicitó la baja desde un correo. No se puede reactivar desde la administración.",
      );
    tx.set(ref, {
      ...old.data(),
      enabled,
      version: (old.data()?.version ?? 0) + 1,
      updatedAt: serverTimestamp(),
      updatedBy: actor,
      auditId: audit.id,
    });
    tx.set(audit, auditData(actor, "email.preferences.update", uid));
  });
}
export async function sendFamilyEmail(
  uid: string,
  title: string,
  body: string,
) {
  const { database, actor } = await requireAdmin("emails.send");
  validateMessage(title, body);
  const [pref, service] = await Promise.all([
    getDoc(doc(database, "emailPreferences", uid)),
    getDoc(doc(database, "config", "email")),
  ]);
  if (pref.data()?.enabled === false || pref.data()?.unsubscribed)
    throw new Error("Los correos están desactivados para esta familia.");
  if (
    !service.data()?.enabled ||
    service.data()?.paused ||
    service.data()?.adminMessagesEnabled === false
  )
    throw new Error("El servicio de correos no está activo.");
  const ref = doc(collection(database, "emailQueue")),
    audit = doc(collection(database, "adminAudit")),
    batch = writeBatch(database);
  batch.set(ref, {
    uid,
    title: title.trim(),
    body: body.trim(),
    senderUid: actor,
    createdAt: serverTimestamp(),
    auditId: audit.id,
    state: "pending",
  });
  batch.set(audit, auditData(actor, "email.send", uid));
  await batch.commit();
}
export async function mailUsage() {
  const { database, permissionData } = await requireAdmin();
  if (
    !hasPermission(permissionData, "emails.send") &&
    !hasPermission(permissionData, "settings.manage")
  )
    throw new Error("No tienes permiso para consultar correos.");
  const day = new Date().toISOString().slice(0, 10);
  const [daily, monthly] = await Promise.all([
    getDoc(doc(database, "mailRuntime", `day-${day}`)),
    getDoc(doc(database, "mailRuntime", `month-${day.slice(0, 7)}`)),
  ]);
  return {
    daily: Number(daily.data()?.count ?? 0),
    monthly: Number(monthly.data()?.count ?? 0),
  };
}
export async function setAccountRole(
  uid: string,
  role: "admin" | "member",
  supplied: AdminPermission[] = ["families.view"],
) {
  const { database, actor, permissionData } =
    await requireAdmin("roles.manage");
  const permissions = role === "member" ? [] : normalizePermissions(supplied);
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
    const mine = effectivePermissions(permissionData);
    if (
      permissionData.role !== "owner" &&
      (permissions.some((p) => !mine.includes(p)) ||
        effectivePermissions(existing.data() ?? { role: "member" }).some(
          (p) => !mine.includes(p),
        ))
    )
      throw new Error(
        "Solo el propietario puede conceder o modificar permisos superiores a los tuyos.",
      );
    tx.set(ref, {
      role,
      permissions,
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
  const { database, actor, permissionData } = await requireAdmin();
  const data = input as Record<string, unknown>;
  const required: Record<string, AdminPermission> = {
    adminLoadAnniversaries: "content.manage",
    adminSaveSettings: "settings.manage",
    adminSaveLevel: "content.manage",
    adminFindFamily: "families.view",
    adminUpdateFamily: "families.edit",
    adminSetFamilyReminders: "families.edit",
  };
  if (required[name]) await requireAdmin(required[name]);
  if (name === "adminBootstrap") {
    const [settings, levels] = await Promise.all([
      getDoc(doc(database, "config", "app")),
      hasPermission(permissionData, "content.manage")
        ? getDocs(
            query(collection(database, "levels"), orderBy("order"), limit(200)),
          )
        : Promise.resolve(null),
    ]);
    return {
      settings: { ...defaultSettings, ...settings.data() },
      levels: (levels?.docs ?? []).map((d) => ({ ...d.data(), id: d.id })),
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

export async function saveOptionalEmailSettings(input: EmailSettings) {
  const saved = validateEmailSettings(input),
    { database, actor } = await requireAdmin("settings.manage"),
    ref = doc(database, "config", "email"),
    audit = doc(collection(database, "adminAudit"));
  await runTransaction(database, async (tx) => {
    const old = await tx.get(ref);
    if ((old.data()?.version ?? 0) !== saved.version)
      throw new Error(
        "La configuración de correos cambió. Recarga antes de guardar.",
      );
    tx.set(ref, {
      ...old.data(),
      ...saved,
      version: saved.version + 1,
      auditId: audit.id,
    });
    tx.set(audit, auditData(actor, "email.settings.update", "config/email"));
  });
}
export async function pauseOptionalEmails(paused: boolean) {
  const { database, actor } = await requireAdmin("settings.manage"),
    ref = doc(database, "config", "email"),
    audit = doc(collection(database, "adminAudit"));
  await runTransaction(database, async (tx) => {
    const old = await tx.get(ref);
    if (!old.exists()) throw new Error("Primero configura los correos.");
    tx.update(ref, {
      paused,
      version: (old.data().version ?? 0) + 1,
      auditId: audit.id,
    });
    tx.set(audit, auditData(actor, "email.pause", "config/email"));
  });
}
