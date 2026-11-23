import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { isDevice } from "expo-device";
import { Platform } from "react-native";
import { auth } from "./firebase";

type RemoteStatus = "active" | "unavailable" | "off" | "error";
let status: { uid: string; value: RemoteStatus } | null = null;
let lastRegistration = 0;
export function remoteNoticeStatus(uid: string | null) {
  return status?.uid === uid ? status!.value : "off";
}
export async function syncPushDevice(
  uid: string,
  deviceId: string,
  enabled: boolean,
  force = false,
) {
  if (
    Platform.OS === "web" ||
    !isDevice ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    status = { uid, value: "unavailable" };
    return;
  }
  if (auth?.currentUser?.uid !== uid) return;
  if (
    enabled &&
    !force &&
    status?.uid === uid &&
    status.value === "active" &&
    Date.now() - lastRegistration < 60000
  )
    return;
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const key = `@entre-dos/push-token/${uid}`;
    const notifications = await import("expo-notifications");
    let token = await AsyncStorage.getItem(key);
    if (enabled) {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) throw Error("Missing notification project");
      const timeout = new Promise<never>((_, reject) => {
        if (controller.signal.aborted) reject(Error("Notification timeout"));
        else
          controller.signal.addEventListener(
            "abort",
            () => reject(Error("Notification timeout")),
            { once: true },
          );
      });
      token = (
        await Promise.race([
          notifications.getExpoPushTokenAsync({ projectId }),
          timeout,
        ])
      ).data;
      await AsyncStorage.setItem(key, token);
    }
    if (auth.currentUser?.uid !== uid || !token) {
      status = { uid, value: "off" };
      return;
    }
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(
      "https://entre-dos-correo.sevenawesome-srl.workers.dev/notifications/device",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          token,
          deviceId,
          enabled,
          platform: Platform.OS,
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) throw Error("Notification registration failed");
    const result = await response.json();
    status = { uid, value: result.enabled ? "active" : "off" };
    lastRegistration = Date.now();
    if (!enabled) await AsyncStorage.removeItem(key);
  } catch {
    status = { uid, value: "error" };
  } finally {
    clearTimeout(timer);
  }
}
