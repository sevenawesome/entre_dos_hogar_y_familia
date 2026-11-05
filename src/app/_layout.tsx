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
  subscribeSettings,
  subscribeControls,
  subscribeSocial,
} from "../services/api";
import { FirstVisitGuide } from "../components/FirstVisitGuide";
import { colors, Notice } from "../components/ui";
import {
  notificationResponseListener,
  registerDevice,
  refreshDevice,
  presentInbox,
} from "../services/notifications";
import { AppState } from "react-native";

function AppLayout() {
  const {
    ready,
    uid,
    demo,
    family,
    error,
    progress,
    levels,
    settings,
    controls,
    inbox,
    catalogReady,
    progressReady,
  } = useApp();
  const [familyLoaded, setFamilyLoaded] = useState(false);
  const segments = useSegments();
  const hasFamily = !!family;
  const needsMarriageDate = !!family && !family.marriageDate;
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
      ...subscribeSocial(uid, fail),
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
      subscribeSettings(
        (settings) => store.dispatch(actions.settings(settings)),
        fail,
      ),
      subscribeControls(
        uid,
        (controls) => store.dispatch(actions.controls(controls)),
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
    else if (
      uid &&
      (demo || familyLoaded) &&
      (!family || needsMarriageDate) &&
      root !== "onboarding" &&
      root !== "privacy"
    )
      router.replace("/onboarding");
    else if (
      uid &&
      family &&
      !needsMarriageDate &&
      (root === "welcome" || root === "onboarding" || !root)
    )
      router.replace("/(tabs)");
  }, [ready, uid, family, demo, familyLoaded, needsMarriageDate, segments]);
  useEffect(() => {
    if (!uid || demo || !hasFamily) return;
    registerDevice().catch((e) =>
      store.dispatch(actions.error(friendlyError(e))),
    );
    const state = AppState.addEventListener("change", (status) => {
      if (status === "active") refreshDevice().catch(() => {});
    });
    const listener = notificationResponseListener((screen) =>
      router.push(screen === "inbox" ? "/inbox" : "/(tabs)"),
    );
    return () => {
      state.remove();
      listener?.remove();
    };
  }, [uid, demo, hasFamily]);
  const reminderKey = JSON.stringify({
    uid,
    family,
    catalogReady,
    progressReady,
    levels: levels.map((l) => l.id),
    progress: Object.values(progress).map((p) => [
      p.levelId,
      p.completions.length,
      p.finishedAt,
    ]),
    enabled: settings.notificationsEnabled,
    paused: controls.remindersPaused,
  });
  useEffect(() => {
    if (uid && !demo && hasFamily) refreshDevice().catch(() => {});
  }, [uid, demo, hasFamily, reminderKey]);
  useEffect(() => {
    if (uid && !demo) presentInbox(inbox).catch(() => {});
  }, [uid, demo, inbox]);
  return (
    <>
      <StatusBar style="dark" />
      <FirstVisitGuide />
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
          name="guide"
          options={{ presentation: "modal", gestureEnabled: false }}
        />
        <Stack.Screen name="admin" options={{ presentation: "modal" }} />
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
