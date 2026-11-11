import * as SplashScreen from "expo-splash-screen";
import { BrandedLaunch } from "../components/BrandedLaunch";
import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { Stack, router, useSegments } from "expo-router";
import { onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { store, actions, useApp } from "../store";
import { auth } from "../services/firebase";
import {
  subscribeCatalog,
  subscribeBranding,
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
  presentLevelNews,
} from "../services/notifications";
import { AppState } from "react-native";
import { syncPublicProfile } from "../services/spark";
import { syncEmailSummary } from "../services/email";

SplashScreen.preventAutoHideAsync().catch(() => {});

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
    journey,
    journeyReady,
    portraits,
    communityProfile,
    emailVerified,
    levelNewsRead,
    levelNewsReady,
  } = useApp();
  const [familyLoaded, setFamilyLoaded] = useState(false);
  const segments = useSegments();
  useEffect(() => subscribeBranding(), []);
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
        store.dispatch(
          actions.accountEmail({
            email: user?.email ?? null,
            verified: user?.emailVerified ?? false,
          }),
        );
      }
    });
  }, []);
  useEffect(() => {
    if (!auth) return;
    return onIdTokenChanged(auth, (user) => {
      if (!store.getState().app.demo)
        store.dispatch(
          actions.accountEmail({
            email: user?.email ?? null,
            verified: user?.emailVerified ?? false,
          }),
        );
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
    if (uid && !demo && hasFamily) syncEmailSummary().catch(() => {});
  }, [uid, demo, hasFamily, emailVerified]);
  useEffect(() => {
    if (
      uid &&
      !demo &&
      family &&
      progressReady &&
      (communityProfile?.uid || Object.keys(portraits).length > 0)
    )
      syncPublicProfile(uid).catch(() => {});
  }, [
    uid,
    demo,
    family,
    progress,
    portraits,
    progressReady,
    communityProfile?.uid,
  ]);
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
    const listener = notificationResponseListener((screen, levelId) => {
      if (
        screen === "level-intro" &&
        levelId &&
        /^[a-zA-Z0-9_-]{1,100}$/.test(levelId)
      )
        router.push({ pathname: "/level-intro", params: { levelId } });
      else
        router.push(
          screen === "anniversary-memories"
            ? "/anniversary-memories"
            : screen === "inbox"
              ? "/inbox"
              : "/(tabs)",
        );
    });
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
    journey,
    journeyReady,
    levels: levels.map((l) => l.id),
    progress: Object.values(progress).map((p) => [
      p.levelId,
      p.completions.length,
      p.finishedAt,
      p.lastCompletionAt,
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
  const levelNewsKey = JSON.stringify({
    ids: levels.map((l) => l.id),
    levelNewsRead,
    levelNewsReady,
    catalogReady,
    enabled: settings.notificationsEnabled,
    paused: controls.remindersPaused,
  });
  useEffect(() => {
    if (uid && !demo) presentLevelNews().catch(() => {});
  }, [uid, demo, levelNewsKey]);
  return (
    <>
      <StatusBar
        style={segments.at(-1) === "administration" ? "light" : "dark"}
      />
      <FirstVisitGuide />
      {!!error && <Notice error text={error} />}
      <Stack
        screenOptions={{
          title: "Amor que permanece",
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
      <BrandedLaunch
        ready={ready && (!uid || demo || familyLoaded || !!error)}
      />
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
