import {
  Image,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { colors, serif } from "./ui";
export function LaunchArtwork({
  onImageReady,
  onClose,
}: {
  onImageReady?: () => void;
  onClose?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const logoWidth = Math.min(350, width - 64);
  return (
    <View
      accessibilityLabel="Amor que permanece. Una vida juntos frente al mar."
      style={[
        StyleSheet.absoluteFill,
        { width, height, backgroundColor: colors.cream },
      ]}
    >
      <Image
        source={require("../../assets/brand/splash-art.jpg")}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { width, height }]}
        onLoadEnd={onImageReady}
      />
      <View
        style={{
          alignItems: "center",
          paddingHorizontal: 32,
          paddingTop: Math.max(64, height * 0.12),
          gap: 12,
        }}
      >
        <Image
          source={require("../../assets/logo.png")}
          resizeMode="contain"
          style={{ width: logoWidth, height: logoWidth / 2 }}
        />
        <Text
          style={{
            fontSize: 17,
            fontFamily: serif,
            color: colors.ink,
            textAlign: "center",
          }}
        >
          Un día a la vez. Una vida juntos.
        </Text>
        {!onClose && <ActivityIndicator color={colors.gold} />}
      </View>
      {onClose && (
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={{
            position: "absolute",
            bottom: 32,
            alignSelf: "center",
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.navy,
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            Volver a configuración
          </Text>
        </Pressable>
      )}
    </View>
  );
}
/** Keep the artwork visible briefly even when a cached sign-in resolves immediately. */
export function BrandedLaunch({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(true),
    [artReady, setArtReady] = useState(false),
    [introFinished, setIntroFinished] = useState(false);
  useEffect(() => {
    if (!artReady) return;
    const timer = setTimeout(() => setIntroFinished(true), 1200);
    return () => clearTimeout(timer);
  }, [artReady]);
  useEffect(() => {
    if (!ready || !artReady || !introFinished || !visible) return;
    const frame = requestAnimationFrame(() => setVisible(false));
    return () => cancelAnimationFrame(frame);
  }, [ready, artReady, introFinished, visible]);
  if (!visible) return null;
  return (
    <View
      accessibilityLabel="Amor que permanece. Preparando su espacio."
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 1000, backgroundColor: colors.cream },
      ]}
    >
      <LaunchArtwork
        onImageReady={() => {
          setArtReady(true);
          SplashScreen.hide();
        }}
      />
    </View>
  );
}
