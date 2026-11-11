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
  where,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { auth, db } from "./firebase";
import {
  currentChallenge,
  emptyProgress,
  isUnlocked,
} from "../domain/progress";
import {
  DAY_MS,
  milliseconds,
  publicProjectionFromSummary,
} from "../domain/community";
import { validateFamilyProfile } from "../domain/admin-validation";
import { validFamilyPhoto } from "../domain/family-photo";
import { validatePortraits, publicBirthdayPeople } from "../domain/people";
import { nextChallengeAvailableAt } from "../domain/journey-timing";
import type {
  CommunityProfile,
  Family,
  FamilySummary,
  Level,
  Progress,
  FamilyPortraits,
  JourneyStart,
} from "../domain/types";

const database = () => {
  if (!db || !auth?.currentUser)
    throw new Error("Inicia sesión para guardar sus datos.");
  return db;
};
export async function saveSparkFamily(
  uid: string,
  family: Family,
  photo?: string | null,
) {
  family = validateFamilyProfile(family);
  const databaseRef = database();
  await runTransaction(databaseRef, async (tx) => {
    const summaryRef = doc(databaseRef, "tracking", uid),
      photoRef = doc(databaseRef, "portraits", uid),
      profileRef = doc(databaseRef, "community", uid),
      familyRef = doc(databaseRef, "families", uid),
      avatarRef = doc(databaseRef, "avatars", uid);
    const [summary, photos, profile, oldFamily, oldAvatar] = await Promise.all([
      tx.get(summaryRef),
      tx.get(photoRef),
      tx.get(profileRef),
      tx.get(familyRef),
      tx.get(avatarRef),
    ]);
    if (
      !oldFamily.exists() &&
      !validFamilyPhoto(photo ?? oldAvatar.data()?.dataUri)
    )
      throw Error(
        "Para completar el registro necesitan una foto de su familia.",
      );
    if (photo) {
      if (!validFamilyPhoto(photo))
        throw Error("La foto no tiene un formato válido.");
      tx.set(avatarRef, { dataUri: photo, updatedAt: serverTimestamp() });
    }
    const people = validatePortraits(
      (photos.data()?.people ?? {}) as FamilyPortraits,
      family,
    );
    tx.set(doc(databaseRef, "families", uid), family);
    if (photos.exists())
      tx.set(photoRef, {
        people,
        editKey: null,
        publicPeople: publicBirthdayPeople(family, people),
        updatedAt: serverTimestamp(),
      });
    if (profile.exists())
      tx.set(profileRef, {
        ...publicProjectionFromSummary(
          profile.data() as CommunityProfile,
          family,
          {
            totalCompleted: summary.data()?.totalCompleted ?? 0,
            finishedCount: summary.data()?.finishedCount ?? 0,
          },
          people,
        ),
        updatedAt: serverTimestamp(),
      });
    if (!summary.exists()) {
      tx.set(doc(databaseRef, "mailEvents", `welcome-${uid}`), {
        uid,
        kind: "welcome",
        levelId: null,
        state: "pending",
        createdAt: serverTimestamp(),
        nextAttemptAt: serverTimestamp(),
      });
      tx.set(summaryRef, {
        uid,
        familyName: family.name,
        email: auth!.currentUser!.email ?? "",
        emailVerified: auth!.currentUser!.emailVerified,
        joinedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        lastCompletedAt: null,
        levelId: "",
        levelOrder: 0,
        completedCount: 0,
        totalCompleted: 0,
        finishedCount: 0,
      });
    } else
      tx.update(summaryRef, {
        familyName: family.name,
        lastActivityAt: serverTimestamp(),
        emailVerified: auth!.currentUser!.emailVerified,
      });
  });
  await syncPublicProfile(uid).catch(() => {});
}
export async function startSparkJourney(
  levelId: string,
): Promise<JourneyStart> {
  const databaseRef = database(),
    uid = auth!.currentUser!.uid,
    ref = doc(databaseRef, "journeys", uid);
  await runTransaction(databaseRef, async (tx) => {
    const [existing, level, summary] = await Promise.all([
      tx.get(ref),
      tx.get(doc(databaseRef, "levels", levelId)),
      tx.get(doc(databaseRef, "tracking", uid)),
    ]);
    if (existing.exists()) return;
    if (
      !summary.exists() ||
      summary.data().totalCompleted !== 0 ||
      !level.data()?.published ||
      level.data()?.order !== 1
    )
      throw new Error(
        "El primer nivel todavía no está disponible para iniciar.",
      );
    tx.set(ref, { levelId, startedAt: serverTimestamp() });
  });
  const saved = (await getDoc(ref)).data()!;
  return {
    levelId: saved.levelId,
    startedAt: new Date(milliseconds(saved.startedAt)!).toISOString(),
  };
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
    const [levelSnap, previousSnap, summarySnap, started] = await Promise.all([
      tx.get(levelRef),
      tx.get(progressRef),
      tx.get(summaryRef),
      tx.get(doc(databaseRef, "journeys", uid)),
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
    if (!started.exists() && summary.totalCompleted === 0)
      throw new Error("Pulsen primero «Comenzar nuestro primer reto» en Hoy.");
    const last = milliseconds(summary.lastCompletedAt);
    const next = last === null ? 0 : last + DAY_MS;
    if (Date.now() < next)
      throw new Error(
        "El siguiente reto se abre 24 horas después de completar el anterior.",
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
      nextAvailableAt: nextChallengeAvailableAt(Date.now()),
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
      emailVerified: auth!.currentUser!.emailVerified,
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
    tx.set(doc(databaseRef, "mailEvents", `level-${uid}-${levelId}`), {
      uid,
      kind: "levelCompleted",
      levelId,
      state: "pending",
      createdAt: serverTimestamp(),
      nextAttemptAt: serverTimestamp(),
    });
    tx.update(progressRef, {
      answers: clean,
      finishedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
    tx.update(summaryRef, {
      lastActivityAt: serverTimestamp(),
      finishedCount: summary.data().finishedCount + 1,
      emailVerified: auth!.currentUser!.emailVerified,
    });
  });
  await syncPublicProfile(uid).catch(() => {});
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  return value;
}
export async function syncPublicProfile(uid: string) {
  if (!db || auth?.currentUser?.uid !== uid) return;
  const databaseRef = db;
  await runTransaction(databaseRef, async (tx) => {
    const profileRef = doc(databaseRef, "community", uid),
      photoRef = doc(databaseRef, "portraits", uid);
    const [profile, family, photos, summary] = await Promise.all([
      tx.get(profileRef),
      tx.get(doc(databaseRef, "families", uid)),
      tx.get(photoRef),
      tx.get(doc(databaseRef, "tracking", uid)),
    ]);
    if (!family.exists() || !summary.exists()) return;
    const f = family.data() as Family,
      people = validatePortraits(photos.data()?.people ?? {}, f),
      publicPeople = publicBirthdayPeople(f, people);
    const same = (a: unknown, b: unknown) =>
      JSON.stringify(stable(a)) === JSON.stringify(stable(b));
    if (
      photos.exists() &&
      (!same(people, photos.data().people) ||
        !same(publicPeople, photos.data().publicPeople ?? []))
    )
      tx.set(photoRef, {
        people,
        editKey: null,
        publicPeople,
        updatedAt: serverTimestamp(),
      });
    if (profile.exists()) {
      const projected = publicProjectionFromSummary(
        profile.data() as CommunityProfile,
        f,
        {
          totalCompleted: summary.data().totalCompleted,
          finishedCount: summary.data().finishedCount,
        },
        people,
      );
      const { updatedAt: _updated, ...current } = profile.data();
      if (!same(projected, current))
        tx.set(profileRef, { ...projected, updatedAt: serverTimestamp() });
    }
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
    ["families", uid, "levelNews"],
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
  for (const root of ["emailQueue", "mailJobs", "mailEvents"]) {
    for (;;) {
      const page = await getDocs(
        query(
          collection(databaseRef, root),
          where("uid", "==", uid),
          limit(100),
        ),
      );
      if (page.empty) break;
      const clean = writeBatch(databaseRef);
      page.docs.forEach((d) => clean.delete(d.ref));
      await clean.commit();
    }
  }
  for (const field of ["recipientUid", "senderUid"]) {
    for (;;) {
      const page = await getDocs(
        query(
          collection(databaseRef, "anniversaryMessages"),
          where(field, "==", uid),
          limit(8),
        ),
      );
      if (page.empty) break;
      const clean = writeBatch(databaseRef);
      for (const d of page.docs) {
        clean.delete(d.ref);
        if (field === "senderUid")
          clean.delete(
            doc(
              databaseRef,
              "families",
              d.data().recipientUid,
              "inbox",
              `anniversary-${d.id}`,
            ),
          );
      }
      await clean.commit();
    }
  }
  const batch = writeBatch(databaseRef);
  for (const name of [
    "community",
    "avatars",
    "portraits",
    "journeys",
    "tracking",
    "familyControls",
    "emailPreferences",
    "families",
  ])
    batch.delete(doc(databaseRef, name, uid));
  if (role.exists()) batch.delete(doc(databaseRef, "roles", uid));
  await batch.commit();
  await deleteUser(user);
  // The deletion marker remains to prevent stale tokens from recreating data.
}
