import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import {
  onCall,
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import {
  emptyProgress,
  currentChallenge,
  nextLocalDay,
  canComplete,
  canCompleteJourney,
} from "../../src/domain/progress";
import type { Level, Progress, Family } from "../../src/domain/types";
import { getFamilyBirthdays } from "../../src/domain/birthdays";
import { nextReminder, validTimezone } from "./timing";
import { getAnniversary, reminderContent } from "../../src/domain/anniversary";
export {
  adminBootstrap,
  adminSaveSettings,
  adminSaveLevel,
  adminFindFamily,
  adminUpdateFamily,
  adminSetFamilyReminders,
} from "./admin";

initializeApp();
const db = getFirestore();
const region = "us-central1";
const expoAccessToken = defineSecret("EXPO_ACCESS_TOKEN");
function uidOf(request: CallableRequest): string {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Inicia sesión para continuar.");
  return request.auth.uid;
}
function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))
    throw new HttpsError("invalid-argument", "Identificador inválido.");
  return value;
}
function shortText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max)
    throw new HttpsError("invalid-argument", "Texto inválido.");
  return value.trim();
}

export const completeChallenge = onCall({ region }, async (request) => {
  const uid = uidOf(request),
    levelId = identifier(request.data?.levelId),
    challengeId = identifier(request.data?.challengeId),
    note = shortText(request.data?.note ?? "", 2000);
  const familyRef = db.doc(`families/${uid}`),
    levelRef = db.doc(`levels/${levelId}`),
    progressRef = familyRef.collection("progress").doc(levelId);
  await db.runTransaction(async (tx) => {
    const [familySnap, levelSnap, progressSnap, deletion, daily] =
      await tx.getAll(
        familyRef,
        levelRef,
        progressRef,
        db.doc(`deletedAccounts/${uid}`),
        familyRef.collection("state").doc("daily"),
      );
    if (deletion.exists)
      throw new HttpsError(
        "permission-denied",
        "Esta cuenta está siendo eliminada.",
      );
    if (!familySnap.exists || !levelSnap.exists || !levelSnap.data()?.published)
      throw new HttpsError("not-found", "La familia o el nivel no existe.");
    const level = levelSnap.data() as Level;
    const progress = progressSnap.exists
      ? (progressSnap.data() as Progress)
      : emptyProgress(levelId);
    if (level.prerequisiteId) {
      const previous = await tx.get(
        familyRef.collection("progress").doc(level.prerequisiteId),
      );
      if (!previous.data()?.finishedAt)
        throw new HttpsError(
          "failed-precondition",
          "Completen el nivel anterior.",
        );
    }
    // Both phones can submit the same completion; the second is an idempotent success.
    if (progress.completions.some((c) => c.challengeId === challengeId)) return;
    if (
      progress.finishedAt ||
      currentChallenge(level, progress)?.id !== challengeId
    )
      throw new HttpsError(
        "failed-precondition",
        "Completen primero el reto pendiente.",
      );
    const allProgress = await tx.get(familyRef.collection("progress"));
    if (
      !canCompleteJourney(
        Object.fromEntries(
          allProgress.docs.map((d) => [d.id, d.data() as Progress]),
        ),
      ) ||
      !canComplete(daily.exists ? (daily.data() as Progress) : undefined)
    )
      throw new HttpsError(
        "failed-precondition",
        "El siguiente reto estará disponible mañana.",
      );
    const timezone = familySnap.data()!.timezone;
    if (!validTimezone(timezone))
      throw new HttpsError(
        "failed-precondition",
        "Revisa la zona horaria de la familia.",
      );
    const now = new Date();
    tx.set(familyRef.collection("state").doc("daily"), {
      nextAvailableAt: nextLocalDay(timezone, now),
      completedAt: now.toISOString(),
    });
    tx.set(progressRef, {
      ...progress,
      completions: [
        ...progress.completions,
        { challengeId, note, completedAt: now.toISOString() },
      ],
      nextAvailableAt: nextLocalDay(timezone, now),
    });
  });
  return { ok: true };
});

export const finishLevel = onCall({ region }, async (request) => {
  const uid = uidOf(request),
    levelId = identifier(request.data?.levelId),
    input = request.data?.answers;
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpsError("invalid-argument", "Completen la reflexión final.");
  const familyRef = db.doc(`families/${uid}`),
    ref = familyRef.collection("progress").doc(levelId);
  await db.runTransaction(async (tx) => {
    const [family, levelSnap, progressSnap, deletion] = await tx.getAll(
      familyRef,
      db.doc(`levels/${levelId}`),
      ref,
      db.doc(`deletedAccounts/${uid}`),
    );
    if (deletion.exists)
      throw new HttpsError(
        "permission-denied",
        "Esta cuenta está siendo eliminada.",
      );
    if (!family.exists || !levelSnap.data()?.published || !progressSnap.exists)
      throw new HttpsError(
        "not-found",
        "No encontramos el progreso de este nivel.",
      );
    const level = levelSnap.data() as Level,
      progress = progressSnap.data() as Progress;
    if (progress.finishedAt) return;
    if (currentChallenge(level, progress))
      throw new HttpsError(
        "failed-precondition",
        "Todavía quedan retos por completar.",
      );
    const answers = Object.fromEntries(
      level.questions.map((q) => {
        const value = shortText(input[q.id], 2000);
        if (!value)
          throw new HttpsError(
            "invalid-argument",
            "Respondan todas las preguntas.",
          );
        return [q.id, value];
      }),
    );
    tx.set(ref, { ...progress, answers, finishedAt: new Date().toISOString() });
  });
  return { ok: true };
});

export const saveDevice = onCall({ region }, async (request) => {
  const uid = uidOf(request),
    id = identifier(request.data?.deviceId);
  const { enabled, hour, minute, timezone, token, platform } = request.data;
  if (
    typeof enabled !== "boolean" ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59 ||
    !validTimezone(timezone) ||
    !["ios", "android"].includes(platform) ||
    (enabled && (typeof token !== "string" || !Expo.isExpoPushToken(token)))
  )
    throw new HttpsError(
      "invalid-argument",
      "Preferencias de notificación inválidas.",
    );
  const [family, deletion] = await db.getAll(
    db.doc(`families/${uid}`),
    db.doc(`deletedAccounts/${uid}`),
  );
  if (deletion.exists)
    throw new HttpsError(
      "permission-denied",
      "Esta cuenta está siendo eliminada.",
    );
  if (!family.exists)
    throw new HttpsError("not-found", "Primero registra tu familia.");
  const ref = db.doc(`families/${uid}/devices/${id}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref),
      old = snap.data();
    const sameSchedule =
      old?.hour === hour &&
      old?.minute === minute &&
      old?.timezone === timezone &&
      old?.enabled === enabled;
    tx.set(
      ref,
      {
        enabled,
        hour,
        minute,
        timezone,
        token: enabled ? token : null,
        platform,
        updatedAt: Timestamp.now(),
        nextReminderAt:
          sameSchedule && old?.nextReminderAt
            ? old.nextReminderAt
            : Timestamp.fromDate(nextReminder(timezone, hour, minute)),
      },
      { merge: true },
    );
  });
  return { ok: true };
});

export const deleteFamilyAccount = onCall({ region }, async (request) => {
  const uid = uidOf(request);
  const authTime = Number(request.auth?.token.auth_time ?? 0);
  if (Date.now() / 1000 - authTime > 300)
    throw new HttpsError(
      "failed-precondition",
      "Por seguridad, cierra sesión e ingresa otra vez antes de eliminar la cuenta.",
    );
  // Revoke before deleting so the other phone cannot recreate the family with an old token.
  await db
    .doc(`deletedAccounts/${uid}`)
    .set({ expiresAt: Timestamp.fromMillis(Date.now() + 2 * 3600000) });
  await getAuth().updateUser(uid, { disabled: true });
  await getAuth().revokeRefreshTokens(uid);
  try {
    await db.recursiveDelete(db.doc(`families/${uid}`));
    await db.doc(`familyControls/${uid}`).delete();
    const pendingReceipts = await db
      .collection("pushReceipts")
      .where("familyUid", "==", uid)
      .get();
    const writer = db.bulkWriter();
    for (const receipt of pendingReceipts.docs) writer.delete(receipt.ref);
    await writer.close();
    await getAuth().deleteUser(uid);
  } catch (error) {
    logger.error("Account deletion needs retry", { uid, error });
    await getAuth()
      .updateUser(uid, { disabled: false })
      .catch(() => {});
    await db.doc(`deletedAccounts/${uid}`).delete();
    throw new HttpsError(
      "internal",
      "No pudimos terminar la eliminación. Vuelve a iniciar sesión e inténtalo otra vez.",
    );
  }
  return { ok: true };
});

export const sendDailyReminders = onSchedule(
  {
    schedule: "every 15 minutes",
    region,
    timeZone: "UTC",
    secrets: [expoAccessToken],
    timeoutSeconds: 300,
  },
  async () => {
    const expo = new Expo({ accessToken: expoAccessToken.value() });
    const globalConfig = await db.doc("config/app").get();
    if (globalConfig.data()?.notificationsEnabled === false) return;
    const now = Timestamp.now();
    // Bounded batches keep a large backlog from exhausting one invocation.
    for (let batch = 0; batch < 10; batch++) {
      const devices = await db
        .collectionGroup("devices")
        .where("enabled", "==", true)
        .where("nextReminderAt", "<=", now)
        .limit(200)
        .get();
      if (devices.empty) break;
      for (const device of devices.docs) {
        const claimed = await db.runTransaction(async (tx) => {
          const fresh = await tx.get(device.ref),
            d = fresh.data();
          if (
            !d?.enabled ||
            !d.nextReminderAt ||
            d.nextReminderAt.toMillis() > now.toMillis() ||
            (d.leaseUntil?.toMillis() ?? 0) > Date.now()
          )
            return null;
          tx.update(device.ref, {
            leaseUntil: Timestamp.fromMillis(Date.now() + 6 * 60000),
          });
          return d;
        });
        if (!claimed) continue;
        try {
          const familyRef = device.ref.parent.parent!;
          const [family, levelsSnap, progressSnap, deletion, controls] =
            await Promise.all([
              familyRef.get(),
              db
                .collection("levels")
                .where("published", "==", true)
                .orderBy("order")
                .get(),
              familyRef.collection("progress").get(),
              db.doc(`deletedAccounts/${familyRef.id}`).get(),
              db.doc(`familyControls/${familyRef.id}`).get(),
            ]);
          const progress = Object.fromEntries(
            progressSnap.docs.map((d) => [d.id, d.data() as Progress]),
          );
          const level = levelsSnap.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Level)
            .find(
              (l) =>
                !progress[l.id]?.finishedAt &&
                (!l.prerequisiteId || progress[l.prerequisiteId]?.finishedAt),
            );
          const challenge = level
            ? currentChallenge(level, progress[level.id])
            : undefined;
          const familyData = family.data();
          const scheduledTime = claimed.nextReminderAt.toDate();
          const anniversaryTime =
            now.toMillis() - scheduledTime.getTime() < 86400000
              ? scheduledTime
              : now.toDate();
          const anniversary =
            familyData && validTimezone(familyData.timezone)
              ? getAnniversary(
                  familyData.marriageDate,
                  familyData.timezone,
                  anniversaryTime,
                )
              : null;
          const birthdayEvents =
            familyData && validTimezone(familyData.timezone)
              ? getFamilyBirthdays(
                  familyData as Family,
                  anniversaryTime,
                ).filter((b) => b.isToday)
              : [];
          const content = reminderContent({
            anniversary,
            lastAnniversaryKey: claimed.lastAnniversaryKey,
            levelId: level?.id,
            challengeTitle: challenge?.title,
            challengeReady: !!level && canCompleteJourney(progress),
            birthdays: birthdayEvents.map((b) => ({
              name: b.name,
              age: b.nextAge,
              key: b.key,
            })),
            lastBirthdayKeys: claimed.lastBirthdayKeys,
          });
          if (
            !family.exists ||
            deletion.exists ||
            controls.data()?.remindersPaused ||
            !content
          ) {
            await device.ref.update({
              nextReminderAt: Timestamp.fromDate(
                nextReminder(claimed.timezone, claimed.hour, claimed.minute),
              ),
              leaseUntil: FieldValue.delete(),
            });
            continue;
          }
          // Read the token again just before delivery, honoring a recent logout or pause.
          const latest = (await device.ref.get()).data();
          if (!latest?.enabled || latest.token !== claimed.token) {
            await device.ref.update({ leaseUntil: FieldValue.delete() });
            continue;
          }
          const message: ExpoPushMessage = {
            to: claimed.token,
            sound: "default",
            channelId: "retos",
            title: content.title,
            body: content.body,
            data: content.data,
          };
          const [ticket] = await expo.sendPushNotificationsAsync([message]);
          if (ticket.status === "error") {
            if (ticket.details?.error === "DeviceNotRegistered") {
              await device.ref.update({
                enabled: false,
                token: null,
                leaseUntil: FieldValue.delete(),
              });
              continue;
            }
            throw new Error(ticket.message);
          }
          await db
            .collection("pushReceipts")
            .doc(ticket.id)
            .set({
              devicePath: device.ref.path,
              familyUid: familyRef.id,
              token: claimed.token,
              checkAfter: Timestamp.fromMillis(Date.now() + 20 * 60000),
              expiresAt: Timestamp.fromMillis(Date.now() + 86400000),
            });
          await device.ref.update({
            nextReminderAt: Timestamp.fromDate(
              nextReminder(claimed.timezone, claimed.hour, claimed.minute),
            ),
            leaseUntil: FieldValue.delete(),
            lastSentAt: Timestamp.now(),
            ...(content.birthdayKeys.length
              ? { lastBirthdayKeys: birthdayEvents.map((b) => b.key) }
              : {}),
            ...(content.anniversaryKey
              ? { lastAnniversaryKey: content.anniversaryKey }
              : {}),
          });
        } catch (error) {
          logger.error("Reminder failed", {
            devicePath: device.ref.path,
            error,
          });
          await device.ref
            .update({
              leaseUntil: FieldValue.delete(),
              nextReminderAt: Timestamp.fromMillis(Date.now() + 15 * 60000),
            })
            .catch(() => {});
        }
      }
      if (devices.size < 200) break;
    }
  },
);

export const checkPushReceipts = onSchedule(
  { schedule: "every 30 minutes", region, secrets: [expoAccessToken] },
  async () => {
    const expo = new Expo({ accessToken: expoAccessToken.value() });
    const receipts = await db
      .collection("pushReceipts")
      .where("checkAfter", "<=", Timestamp.now())
      .limit(300)
      .get();
    for (const ids of expo.chunkPushNotificationReceiptIds(
      receipts.docs.map((d) => d.id),
    )) {
      const statuses = await expo.getPushNotificationReceiptsAsync(ids);
      for (const id of ids) {
        const snap = receipts.docs.find((d) => d.id === id)!,
          status = statuses[id];
        if (!status && snap.data().expiresAt.toMillis() > Date.now()) continue;
        if (
          status?.status === "error" &&
          status.details?.error === "DeviceNotRegistered"
        ) {
          const ref = db.doc(snap.data().devicePath);
          await db.runTransaction(async (tx) => {
            const device = await tx.get(ref);
            if (device.exists && device.data()?.token === snap.data().token)
              tx.update(ref, { enabled: false, token: null });
          });
        }
        if (status?.status === "error")
          logger.warn("Expo delivery error", {
            receiptId: id,
            error: status.details?.error,
          });
        await snap.ref.delete();
      }
    }
  },
);
