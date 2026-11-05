import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { auth, db } from "./firebase";
import {
  currentChallenge,
  emptyProgress,
  isUnlocked,
} from "../domain/progress";
import { DAY_MS, milliseconds, publicProjection } from "../domain/community";
import { validateFamilyProfile } from "../domain/admin-validation";
import type {
  CommunityProfile,
  Family,
  FamilySummary,
  Level,
  Progress,
} from "../domain/types";

const database = () => {
  if (!db || !auth?.currentUser)
    throw new Error("Inicia sesión para guardar sus datos.");
  return db;
};
export async function saveSparkFamily(uid: string, family: Family) {
  family = validateFamilyProfile(family);
  const databaseRef = database();
  await runTransaction(databaseRef, async (tx) => {
    const summaryRef = doc(databaseRef, "tracking", uid),
      summary = await tx.get(summaryRef);
    tx.set(doc(databaseRef, "families", uid), family);
    if (!summary.exists())
      tx.set(summaryRef, {
        uid,
        familyName: family.name,
        email: auth!.currentUser!.email ?? "",
        joinedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        lastCompletedAt: null,
        levelId: "",
        levelOrder: 0,
        completedCount: 0,
        totalCompleted: 0,
        finishedCount: 0,
      });
    else
      tx.update(summaryRef, {
        familyName: family.name,
        lastActivityAt: serverTimestamp(),
      });
  });
  await syncPublicProfile(uid).catch(() => {});
}
export async function completeSparkChallenge(
  levelId: string,
  challengeId: string,
  note: string,
) {
  const databaseRef = database(),
    uid = auth!.currentUser!.uid;
  await runTransaction(databaseRef, async (tx) => {
    const levelRef = doc(databaseRef, "levels", levelId),
      progressRef = doc(databaseRef, "families", uid, "progress", levelId),
      summaryRef = doc(databaseRef, "tracking", uid);
    const [levelSnap, previousSnap, summarySnap] = await Promise.all([
      tx.get(levelRef),
      tx.get(progressRef),
      tx.get(summaryRef),
    ]);
    if (
      !levelSnap.exists() ||
      !levelSnap.data().published ||
      !summarySnap.exists()
    )
      throw new Error("Todavía no está disponible este nivel o perfil.");
    const level = levelSnap.data() as Level,
      previous = previousSnap.exists()
        ? (previousSnap.data() as Progress)
        : emptyProgress(levelId),
      summary = summarySnap.data() as FamilySummary;
    const prerequisite = level.prerequisiteId
      ? await tx.get(
          doc(databaseRef, "families", uid, "progress", level.prerequisiteId),
        )
      : null;
    if (previous.completions.some((c) => c.challengeId === challengeId)) return;
    if (
      previous.finishedAt ||
      !isUnlocked(
        level,
        prerequisite
          ? { [level.prerequisiteId!]: prerequisite.data() as Progress }
          : {},
      ) ||
      currentChallenge(level, previous)?.id !== challengeId
    )
      throw new Error(
        "Completen primero el reto pendiente y su nivel anterior.",
      );
    const next = (milliseconds(summary.lastCompletedAt) ?? 0) + DAY_MS;
    if (Date.now() < next)
      throw new Error(
        "El siguiente reto se abre 24 horas después del anterior.",
      );
    if (note.length > 2000)
      throw new Error("La nota puede tener hasta 2000 caracteres.");
    const completedAt = new Date().toISOString();
    tx.set(progressRef, {
      ...previous,
      completions: [
        ...previous.completions,
        { challengeId, note: note.trim(), completedAt },
      ],
      nextAvailableAt: new Date(Date.now() + DAY_MS).toISOString(),
      lastCompletionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(summaryRef, {
      lastActivityAt: serverTimestamp(),
      lastCompletedAt: serverTimestamp(),
      levelId,
      levelOrder: level.order,
      completedCount: previous.completions.length + 1,
      totalCompleted: summary.totalCompleted + 1,
    });
  });
  // The authoritative write has succeeded. A delayed public projection must never report it as failed.
  await syncPublicProfile(uid).catch(() => {});
}
export async function finishSparkLevel(
  levelId: string,
  answers: Record<string, string>,
) {
  const databaseRef = database(),
    uid = auth!.currentUser!.uid;
  await runTransaction(databaseRef, async (tx) => {
    const levelRef = doc(databaseRef, "levels", levelId),
      progressRef = doc(databaseRef, "families", uid, "progress", levelId),
      summaryRef = doc(databaseRef, "tracking", uid);
    const [l, p, summary] = await Promise.all([
      tx.get(levelRef),
      tx.get(progressRef),
      tx.get(summaryRef),
    ]);
    if (!l.exists() || !p.exists() || !summary.exists())
      throw new Error("No encontramos el progreso.");
    const level = l.data() as Level,
      previous = p.data() as Progress;
    if (previous.finishedAt) return;
    if (
      currentChallenge(level, previous) ||
      level.questions.some(
        (q) => !answers[q.id]?.trim() || answers[q.id].length > 2000,
      )
    )
      throw new Error("Completen todos los retos y las preguntas finales.");
    const clean = Object.fromEntries(
      level.questions.map((q) => [q.id, answers[q.id].trim()]),
    );
    tx.update(progressRef, {
      answers: clean,
      finishedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
    tx.update(summaryRef, {
      lastActivityAt: serverTimestamp(),
      finishedCount: summary.data().finishedCount + 1,
    });
  });
  await syncPublicProfile(uid).catch(() => {});
}
export async function syncPublicProfile(uid: string) {
  if (!db || auth?.currentUser?.uid !== uid) return;
  const ref = doc(db, "community", uid),
    [profile, family, progress] = await Promise.all([
      getDoc(ref),
      getDoc(doc(db, "families", uid)),
      getDocs(collection(db, "families", uid, "progress")),
    ]);
  if (!profile.exists() || !family.exists()) return;
  const map = Object.fromEntries(
    progress.docs.map((p) => [p.id, p.data() as Progress]),
  );
  await setDoc(ref, {
    ...publicProjection(
      profile.data() as CommunityProfile,
      family.data() as Family,
      map,
    ),
    updatedAt: serverTimestamp(),
  });
}
export async function deleteSparkAccount() {
  const databaseRef = database(),
    user = auth!.currentUser!,
    uid = user.uid;
  const role = await getDoc(doc(databaseRef, "roles", uid));
  if (role.data()?.role === "owner")
    throw new Error(
      "El propietario debe transferir su rol desde el script de mantenimiento antes de eliminar la cuenta.",
    );
  const token = await user.getIdTokenResult();
  if (Date.now() - Date.parse(token.authTime) > 5 * 60000)
    throw Object.assign(
      new Error(
        "Por seguridad, vuelve a iniciar sesión antes de eliminar la cuenta.",
      ),
      { code: "auth/requires-recent-login" },
    );
  // Delete private/shared Firestore data while the account can still authenticate; this is resumable.
  const deletionRef = doc(databaseRef, "accountDeletion", uid);
  if (!(await getDoc(deletionRef)).exists())
    await setDoc(deletionRef, { requestedAt: serverTimestamp() });
  for (const path of [
    ["families", uid, "progress"],
    ["families", uid, "devices"],
    ["families", uid, "inbox"],
  ]) {
    for (;;) {
      const page = await getDocs(
        query(collection(databaseRef, path[0], ...path.slice(1)), limit(200)),
      );
      if (page.empty) break;
      const batch = writeBatch(databaseRef);
      page.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  const batch = writeBatch(databaseRef);
  for (const name of [
    "community",
    "avatars",
    "tracking",
    "familyControls",
    "families",
  ])
    batch.delete(doc(databaseRef, name, uid));
  if (role.exists()) batch.delete(doc(databaseRef, "roles", uid));
  await batch.commit();
  await deleteUser(user);
  // The deletion marker remains to prevent stale tokens from recreating data.
}
