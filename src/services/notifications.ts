import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DevicePreferences, FamilyMessage } from "../domain/types";
import { store } from "../store";
import { localReminderPlan } from "../domain/local-reminders";
import { getJourney } from "../domain/journey";
import { journeyStarted, journeyAvailableAt } from "../domain/journey-timing";
import { currentChallenge } from "../domain/progress";
import { levelNewsNotice } from "../domain/level-news";
async function notifications() {
  return Platform.OS === "web" ? null : import("expo-notifications");
}
export async function deviceId() {
  const key = "@entre-dos/device-id";
  let id = await AsyncStorage.getItem(key);
  if (!id) {
    id = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    await AsyncStorage.setItem(key, id);
  }
  return id;
}
const prefKey = () => `@entre-dos/reminders-${store.getState().app.uid}`;
export async function loadPreferences(): Promise<DevicePreferences> {
  const saved = await AsyncStorage.getItem(prefKey());
  return saved
    ? JSON.parse(saved)
    : {
        enabled: false,
        hour: 20,
        minute: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
}
let pending = Promise.resolve();
export function registerDevice(
  preferences?: DevicePreferences,
  askPermission = false,
) {
  const uid = store.getState().app.uid;
  const work = pending
    .catch(() => {})
    .then(async () => {
      if (uid !== store.getState().app.uid) return;
      const n = await notifications();
      if (!n) {
        if (askPermission)
          throw new Error("Los avisos locales se configuran en Android o iOS.");
        return;
      }
      const prefs = {
          ...(preferences ?? (await loadPreferences())),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        state = store.getState().app;
      if (Platform.OS === "android")
        await n.setNotificationChannelAsync("retos", {
          name: "Retos y fechas familiares",
          importance: n.AndroidImportance.DEFAULT,
          sound: "default",
        });
      n.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      let permission = await n.getPermissionsAsync();
      if (askPermission && prefs.enabled && permission.status !== "granted")
        permission = await n.requestPermissionsAsync();
      if (prefs.enabled && permission.status !== "granted")
        throw new Error(
          "Activa las notificaciones en los ajustes del teléfono.",
        );
      if (uid !== store.getState().app.uid) return;
      await n.cancelAllScheduledNotificationsAsync();
      const enabled =
        prefs.enabled &&
        state.settings.notificationsEnabled &&
        !state.controls.remindersPaused;
      if (enabled && state.family) {
        const journey = getJourney(
          state.levels,
          state.progress,
          state.catalogReady && state.progressReady,
        );
        const challenge = journey.current
          ? currentChallenge(
              journey.current,
              state.progress[journey.current.id],
            )
          : undefined;
        for (const item of localReminderPlan(
          state.family,
          prefs,
          !!journey.current &&
            state.journeyReady &&
            journeyStarted(state.progress, state.journey),
          new Date(),
          challenge
            ? {
                order: challenge.order,
                title: challenge.title,
                availableAt: journeyAvailableAt(state.progress),
              }
            : undefined,
        )) {
          const anniversaryKey = item.anniversaryKey
            ? `@entre-dos/anniversary-notified/${uid}/${item.anniversaryKey}`
            : null;
          if (anniversaryKey) {
            const scheduled = await AsyncStorage.getItem(anniversaryKey);
            if (scheduled && Date.parse(scheduled) <= Date.now()) continue;
          }
          await n.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              sound: "default",
              data: {
                screen: item.anniversaryKey
                  ? "anniversary-memories"
                  : item.daily || item.challengeAvailable
                    ? "challenge"
                    : "family",
              },
            },
            trigger: item.daily
              ? {
                  type: n.SchedulableTriggerInputTypes.DAILY,
                  hour: prefs.hour,
                  minute: prefs.minute,
                  channelId: "retos",
                }
              : {
                  type: n.SchedulableTriggerInputTypes.DATE,
                  date: item.date!,
                  channelId: "retos",
                },
          });
          if (anniversaryKey && item.date)
            await AsyncStorage.setItem(anniversaryKey, item.date.toISOString());
        }
      }
      await AsyncStorage.setItem(prefKey(), JSON.stringify(prefs));
      void presentLevelNews().catch(() => {});
    });
  pending = work;
  return work;
}
export async function refreshDevice() {
  await registerDevice();
}
export async function disableDevice() {
  const p = await loadPreferences();
  await registerDevice({ ...p, enabled: false });
}
let inboxPending = Promise.resolve();
export function presentInbox(messages: FamilyMessage[]) {
  const uid = store.getState().app.uid;
  inboxPending = inboxPending
    .catch(() => {})
    .then(async () => {
      if (store.getState().app.uid === uid) await showInbox(messages);
    });
  return inboxPending;
}
async function showInbox(messages: FamilyMessage[]) {
  const state = store.getState().app,
    prefs = await loadPreferences(),
    n = await notifications();
  if (
    !n ||
    !state.uid ||
    !prefs.enabled ||
    !messages.length ||
    !state.settings.notificationsEnabled ||
    state.controls.remindersPaused
  )
    return;
  n.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  const key = `@entre-dos/messages-notified/${state.uid}`;
  let seen: string[] = [];
  try {
    const value = JSON.parse((await AsyncStorage.getItem(key)) ?? "[]");
    if (Array.isArray(value)) seen = value.filter((v) => typeof v === "string");
  } catch {}
  if ((await n.getPermissionsAsync()).status !== "granted") return;
  for (const message of [...messages].reverse()) {
    if (seen.includes(message.id) || !message.createdAt) continue;
    if (store.getState().app.uid !== state.uid) return;
    const age = Date.now() - Date.parse(String(message.createdAt));
    if (age >= 0 && age < 86400000)
      await n.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: {
            screen:
              message.kind === "anniversaryGreeting"
                ? "anniversary-memories"
                : "inbox",
          },
          sound: "default",
        },
        trigger: null,
      });
    seen = [...seen, message.id].slice(-150);
    await AsyncStorage.setItem(key, JSON.stringify(seen));
  }
}
let newsPending = Promise.resolve();
/** Spark mode: a local notice when this phone receives the published catalog. */
export function presentLevelNews() {
  const uid = store.getState().app.uid;
  newsPending = newsPending
    .catch(() => {})
    .then(async () => {
      await pending.catch(() => {});
      const state = store.getState().app;
      if (
        !uid ||
        state.uid !== uid ||
        state.demo ||
        !state.catalogReady ||
        !state.levelNewsReady ||
        !state.settings.notificationsEnabled ||
        state.controls.remindersPaused
      )
        return;
      const prefs = await loadPreferences();
      if (!prefs.enabled) return;
      const n = await notifications();
      if (!n || (await n.getPermissionsAsync()).status !== "granted") return;
      const key = `@entre-dos/level-news-notified/${uid}`;
      let notified: string[] = [];
      try {
        const saved = JSON.parse((await AsyncStorage.getItem(key)) ?? "[]");
        if (Array.isArray(saved))
          notified = saved.filter((v) => typeof v === "string");
      } catch {}
      const notice = levelNewsNotice(
        state.levels,
        state.levelNewsRead,
        notified,
      );
      if (!notice || store.getState().app.uid !== uid) return;
      n.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      await n.scheduleNotificationAsync({
        content: {
          title: notice.title,
          body: notice.body,
          sound: "default",
          data: { screen: "level-intro", levelId: notice.levelId },
        },
        trigger: null,
      });
      await AsyncStorage.setItem(
        key,
        JSON.stringify([...new Set([...notified, ...notice.ids])]),
      );
    });
  return newsPending;
}
export function notificationResponseListener(
  onTap: (screen?: string, levelId?: string) => void,
): { remove(): void } {
  let removed = false;
  let subscription: { remove(): void } | undefined;
  notifications()
    .then(async (n) => {
      if (!n || removed) return;
      subscription = n.addNotificationResponseReceivedListener((response) =>
        onTap(
          String(response.notification.request.content.data?.screen ?? "today"),
          String(response.notification.request.content.data?.levelId ?? ""),
        ),
      );
      const last = await n.getLastNotificationResponseAsync();
      if (last && !removed) {
        onTap(
          String(last.notification.request.content.data?.screen ?? "today"),
          String(last.notification.request.content.data?.levelId ?? ""),
        );
        await n.clearLastNotificationResponseAsync();
      }
    })
    .catch(() => {});
  return {
    remove() {
      removed = true;
      subscription?.remove();
    },
  };
}
