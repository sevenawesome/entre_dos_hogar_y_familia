import type { ExpoConfig } from "expo/config";
const projectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  "f9af2154-9d1b-49d6-bae8-588d83ce3ad7";
if (process.env.EAS_BUILD_PROFILE === "production") {
  const required = [
    projectId,
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  ];
  if (required.some((value) => !value))
    throw new Error(
      "Completa las variables de Firebase y Expo/EAS antes de crear un build de producción.",
    );
}
const config: ExpoConfig = {
  name: "Amor que permanece",
  slug: "entre-dos",
  version: "1.0.0",
  scheme: "entredos",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.sevenawesome.entredos",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: "com.sevenawesome.entredos",
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
      backgroundColor: "#FBF7EE",
    },
  },
  web: { bundler: "metro", favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-sharing",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Amor que permanece usa la foto que elijas para el perfil de tu familia.",
        cameraPermission:
          "Amor que permanece usa la cámara solo cuando elijas tomar la foto de tu familia.",
        microphonePermission: false,
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        largeIcon: "./assets/icon.png",
        color: "#06264A",
        defaultChannel: "retos",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/logo.png",
        imageWidth: 300,
        resizeMode: "contain",
        backgroundColor: "#FBF7EE",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: { ...(projectId ? { eas: { projectId } } : {}) },
};
export default config;
