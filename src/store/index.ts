import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { publicProjection } from "../domain/community";
import { bundledLevels } from "../data/catalog";
import { bundledAnniversaries } from "../data/anniversaries";
import type {
  Family,
  Level,
  ProgressMap,
  AnniversaryCatalog,
  AppSettings,
  FamilyControls,
  AccountRole,
  CommunityProfile,
  FamilyMessage,
} from "../domain/types";
import { defaultSettings } from "../domain/settings";

interface State {
  ready: boolean;
  uid: string | null;
  demo: boolean;
  family: Family | null;
  levels: Level[];
  progress: ProgressMap;
  error: string | null;
  anniversaryCatalog: AnniversaryCatalog;
  settings: AppSettings;
  controls: FamilyControls;
  isAdmin: boolean;
  catalogReady: boolean;
  progressReady: boolean;
  role: AccountRole;
  avatar: string | null;
  communityProfile: CommunityProfile | null;
  inbox: FamilyMessage[];
}
const initialState: State = {
  ready: false,
  uid: null,
  demo: false,
  family: null,
  levels: [],
  progress: {},
  error: null,
  anniversaryCatalog: bundledAnniversaries,
  settings: defaultSettings,
  controls: { remindersPaused: false },
  isAdmin: false,
  catalogReady: false,
  progressReady: false,
  role: "member",
  avatar: null,
  communityProfile: null,
  inbox: [],
};
const slice = createSlice({
  name: "app",
  initialState,
  reducers: {
    session(
      state,
      action: PayloadAction<{ uid: string | null; demo?: boolean }>,
    ) {
      state.uid = action.payload.uid;
      state.demo = !!action.payload.demo;
      state.ready = true;
      state.family = null;
      state.progress = {};
      state.levels = [];
      state.error = null;
      state.anniversaryCatalog = bundledAnniversaries;
      state.settings = defaultSettings;
      state.controls = { remindersPaused: false };
      state.isAdmin = false;
      state.catalogReady = false;
      state.progressReady = false;
      state.role = "member";
      state.avatar = null;
      state.communityProfile = null;
      state.inbox = [];
    },
    family(state, action: PayloadAction<Family | null>) {
      state.family = action.payload;
    },
    levels(state, action: PayloadAction<Level[]>) {
      state.levels = action.payload;
      state.catalogReady = true;
    },
    progress(state, action: PayloadAction<ProgressMap>) {
      state.progress = action.payload;
      state.progressReady = true;
    },
    error(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    anniversaryCatalog(state, action: PayloadAction<AnniversaryCatalog>) {
      state.anniversaryCatalog = action.payload;
    },
    settings(state, action: PayloadAction<AppSettings>) {
      state.settings = action.payload;
    },
    controls(state, action: PayloadAction<FamilyControls>) {
      state.controls = action.payload;
    },
    admin(state, action: PayloadAction<boolean>) {
      state.isAdmin = action.payload;
    },
    role(state, action: PayloadAction<AccountRole>) {
      state.role = action.payload;
      state.isAdmin = action.payload === "owner" || action.payload === "admin";
    },
    avatar(state, action: PayloadAction<string | null>) {
      state.avatar = action.payload;
    },
    communityProfile(state, action: PayloadAction<CommunityProfile | null>) {
      state.communityProfile = action.payload;
    },
    inbox(state, action: PayloadAction<FamilyMessage[]>) {
      state.inbox = action.payload;
    },
  },
});
export const actions = slice.actions;
export const store = configureStore({ reducer: { app: slice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export const useApp = () => useSelector((state: RootState) => state.app);
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
const demoKey = "@entre-dos/demo-v1";
export async function startDemo() {
  const saved = await AsyncStorage.getItem(demoKey);
  let data: {
    family: Family | null;
    progress: ProgressMap;
    avatar?: string | null;
    communityProfile?: CommunityProfile | null;
  } = {
    family: null,
    progress: {},
  };
  if (saved) {
    try {
      data = JSON.parse(saved);
    } catch {
      await AsyncStorage.removeItem(demoKey);
    }
  }
  store.dispatch(actions.session({ uid: "demo", demo: true }));
  store.dispatch(actions.levels(bundledLevels));
  store.dispatch(actions.family(data.family));
  store.dispatch(actions.progress(data.progress));
  store.dispatch(actions.role("owner"));
  store.dispatch(actions.avatar(data.avatar ?? null));
  store.dispatch(
    actions.communityProfile(
      data.communityProfile && data.family
        ? publicProjection(data.communityProfile, data.family, data.progress)
        : null,
    ),
  );
}
let saving = Promise.resolve();
let lastSerialized = "";
store.subscribe(() => {
  const { demo, family, progress, avatar, communityProfile } =
    store.getState().app;
  if (demo) {
    const serialized = JSON.stringify({
      family,
      progress,
      avatar,
      communityProfile,
    });
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    saving = saving
      .then(() => AsyncStorage.setItem(demoKey, serialized))
      .catch(() => {
        store.dispatch(
          actions.error(
            "No se pudo guardar la demostración en este dispositivo.",
          ),
        );
      });
  }
});
