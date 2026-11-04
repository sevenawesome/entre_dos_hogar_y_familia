import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { DevicePreferences } from "../domain/types";
import { callBackend } from "./api";
import { store } from "../store";

// Keep native notification modules out of web preview initialization.
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
function prefKey() {
  return `@entre-dos/reminders-${store.getState().app.uid}`;
}
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
export async function registerDevice(
  preferences?: DevicePreferences,
  askPermission = false,
) {
  const n = await notifications();
  if (!n) {
    if (askPermission)
      throw new Error(
        "Los recordatorios del teléfono se configuran en la app para Android o iOS.",
      );
    return;
  }
  if (store.getState().app.demo)
    throw new Error(
      "Los avisos compartidos requieren conectar Firebase e iniciar sesión en una cuenta real.",
    );
  const prefs = preferences ?? (await loadPreferences());
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
      "Activa el permiso de notificaciones en los ajustes de tu teléfono.",
    );
  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (prefs.enabled && !projectId)
    throw new Error(
      "Falta vincular este proyecto a Expo/EAS para activar las notificaciones.",
    );
  const token = prefs.enabled
    ? (await n.getExpoPushTokenAsync({ projectId })).data
    : null;
  await callBackend("saveDevice", {
    deviceId: await deviceId(),
    token,
    platform: Platform.OS,
    ...prefs,
  });
  await AsyncStorage.setItem(prefKey(), JSON.stringify(prefs));
}
export async function refreshDevice() {
  const prefs = await loadPreferences();
  await registerDevice({
    ...prefs,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}
export async function disableDevice() {
  if (Platform.OS === "web" || store.getState().app.demo) return;
  const prefs = await loadPreferences();
  await registerDevice({ ...prefs, enabled: false });
}
export function notificationResponseListener(
  onTap: () => void,
): { remove(): void } | null {
  let removed = false;
  let subscription: { remove(): void } | undefined;
  notifications().then(async (n) => {
    if (!n || removed) return;
    subscription = n.addNotificationResponseReceivedListener(onTap);
    const last = await n.getLastNotificationResponseAsync();
    if (last && !removed) {
      onTap();
      await n.clearLastNotificationResponseAsync();
    }
  });
  return {
    remove() {
      removed = true;
      subscription?.remove();
    },
  };
}
