import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { persistence } from "./persistence";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseConfigured = Object.values(config).every(Boolean);
const app = firebaseConfigured ? (getApps()[0] ?? initializeApp(config)) : null;
function createAuth(): Auth | null {
  if (!app) return null;
  try {
    return initializeAuth(app, { persistence });
  } catch (error) {
    if ((error as { code?: string }).code === "auth/already-initialized")
      return getAuth(app);
    throw error;
  }
}
export const auth = createAuth();
export const db = app ? getFirestore(app) : null;
