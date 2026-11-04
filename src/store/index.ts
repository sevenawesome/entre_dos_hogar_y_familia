import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bundledLevels } from "../data/catalog";
import { bundledAnniversaries } from "../data/anniversaries";
import type {
  Family,
  Level,
  ProgressMap,
  AnniversaryCatalog,
} from "../domain/types";

interface State {
  ready: boolean;
  uid: string | null;
  demo: boolean;
  family: Family | null;
  levels: Level[];
  progress: ProgressMap;
  error: string | null;
  anniversaryCatalog: AnniversaryCatalog;
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
    },
    family(state, action: PayloadAction<Family | null>) {
      state.family = action.payload;
    },
    levels(state, action: PayloadAction<Level[]>) {
      state.levels = action.payload;
    },
    progress(state, action: PayloadAction<ProgressMap>) {
      state.progress = action.payload;
    },
    error(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    anniversaryCatalog(state, action: PayloadAction<AnniversaryCatalog>) {
      state.anniversaryCatalog = action.payload;
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
  let data: { family: Family | null; progress: ProgressMap } = {
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
}
let saving = Promise.resolve();
let lastSerialized = "";
store.subscribe(() => {
  const { demo, family, progress } = store.getState().app;
  if (demo) {
    const serialized = JSON.stringify({ family, progress });
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
