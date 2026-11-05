import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useSegments } from "expo-router";
import { useApp, store } from "../store";
import { guideKey } from "../domain/help";
export function FirstVisitGuide() {
  const { uid, family } = useApp();
  const root = useSegments()[0];
  const checked = useRef<string | null>(null);
  const hasFamily = !!family;
  useEffect(() => {
    if (!uid) {
      checked.current = null;
      return;
    }
    if (!hasFamily || root !== "(tabs)" || checked.current === uid) return;
    let cancelled = false;
    AsyncStorage.getItem(guideKey(uid))
      .catch(() => null)
      .then((seen) => {
        if (cancelled || store.getState().app.uid !== uid) return;
        checked.current = uid;
        if (!seen) router.push("/guide");
      });
    return () => {
      cancelled = true;
    };
  }, [uid, hasFamily, root]);
  return null;
}
