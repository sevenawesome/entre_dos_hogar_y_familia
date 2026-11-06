import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DevicePreferences, FamilyMessage } from "../domain/types";
import { store } from "../store";
import { localReminderPlan } from "../domain/local-reminders";
import { getJourney } from "../domain/journey";
import { journeyStarted, journeyAvailableAt } from "../domain/journey-timing";
import { currentChallenge } from "../domain/progress";
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
          await n.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              sound: "default",
              data: { screen: "today" },
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
        }
      }
      await AsyncStorage.setItem(prefKey(), JSON.stringify(prefs));
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
export async function presentInbox(messages: FamilyMessage[]) {
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
  const latest = messages[0],
    key = `@entre-dos/message-notified/${state.uid}`;
  if (!latest.createdAt || (await AsyncStorage.getItem(key)) === latest.id)
    return;
  if ((await n.getPermissionsAsync()).status !== "granted") return;
  if (
    latest.createdAt &&
    Date.now() - Date.parse(String(latest.createdAt)) < 86400000
  )
    await n.scheduleNotificationAsync({
      content: {
        title: latest.title,
        body: latest.body,
        data: { screen: "inbox" },
        sound: "default",
      },
      trigger: null,
    });
  await AsyncStorage.setItem(key, latest.id);
}
export function notificationResponseListener(
  onTap: (screen?: string) => void,
): { remove(): void } {
  let removed = false;
  let subscription: { remove(): void } | undefined;
  notifications()
    .then(async (n) => {
      if (!n || removed) return;
      subscription = n.addNotificationResponseReceivedListener((response) =>
        onTap(
          String(response.notification.request.content.data?.screen ?? "today"),
        ),
      );
      const last = await n.getLastNotificationResponseAsync();
      if (last && !removed) {
        onTap(
          String(last.notification.request.content.data?.screen ?? "today"),
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
