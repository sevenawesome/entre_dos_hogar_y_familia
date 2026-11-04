import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { Stack, router, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { store, actions, useApp } from "../store";
import { auth } from "../services/firebase";
import {
  subscribeCatalog,
  subscribeFamily,
  subscribeProgress,
  friendlyError,
  subscribeAnniversaries,
} from "../services/api";
import { colors, Notice } from "../components/ui";
import {
  notificationResponseListener,
  registerDevice,
  refreshDevice,
} from "../services/notifications";
import { AppState } from "react-native";

function AppLayout() {
  const { ready, uid, demo, family, error } = useApp();
  const [familyLoaded, setFamilyLoaded] = useState(false);
  const segments = useSegments();
  const hasFamily = !!family;
  useEffect(() => {
    if (!auth) {
      store.dispatch(actions.session({ uid: null }));
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      if (!store.getState().app.demo) {
        setFamilyLoaded(false);
        store.dispatch(actions.session({ uid: user?.uid ?? null }));
      }
    });
  }, []);
  useEffect(() => {
    if (!uid || demo) return;
    const fail = (e: Error) => store.dispatch(actions.error(friendlyError(e)));
    const stops = [
      subscribeFamily(
        uid,
        (f) => {
          store.dispatch(actions.family(f));
          setFamilyLoaded(true);
        },
        fail,
      ),
      subscribeProgress(uid, (p) => store.dispatch(actions.progress(p)), fail),
      subscribeCatalog((l) => store.dispatch(actions.levels(l)), fail),
      subscribeAnniversaries(
        (c) => store.dispatch(actions.anniversaryCatalog(c)),
        fail,
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [uid, demo]);
  useEffect(() => {
    if (!ready) return;
    const root = segments[0];
    if (!uid && root !== "welcome" && root !== "privacy")
      router.replace("/welcome");
    else if (uid && (demo || familyLoaded) && !family && root !== "onboarding")
      router.replace("/onboarding");
    else if (
      uid &&
      family &&
      (root === "welcome" || root === "onboarding" || !root)
    )
      router.replace("/(tabs)");
  }, [ready, uid, family, demo, familyLoaded, segments]);
  useEffect(() => {
    if (!uid || demo || !hasFamily) return;
    registerDevice().catch((e) =>
      store.dispatch(actions.error(friendlyError(e))),
    );
    const state = AppState.addEventListener("change", (status) => {
      if (status === "active") refreshDevice().catch(() => {});
    });
    const listener = notificationResponseListener(() => router.push("/(tabs)"));
    return () => {
      state.remove();
      listener?.remove();
    };
  }, [uid, demo, hasFamily]);
  return (
    <>
      <StatusBar style="dark" />
      {!!error && <Notice error text={error} />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="challenge" options={{ presentation: "modal" }} />
        <Stack.Screen name="anniversary" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="questionnaire"
          options={{ presentation: "modal" }}
        />
      </Stack>
    </>
  );
}
export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppLayout />
      </SafeAreaProvider>
    </Provider>
  );
}
