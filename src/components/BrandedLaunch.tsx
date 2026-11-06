import { Image, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { colors, serif } from "./ui";
/** The system launch mark transitions to this artwork while the first auth state loads. No forced delay. */
export function BrandedLaunch({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(true),
    [artReady, setArtReady] = useState(false);
  useEffect(() => {
    if (!ready || !artReady || !visible) return;
    const frame = requestAnimationFrame(() => setVisible(false));
    return () => cancelAnimationFrame(frame);
  }, [ready, artReady, visible]);
  if (!visible) return null;
  return (
    <View
      accessibilityLabel="Amor que permanece. Preparando su espacio."
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 1000, backgroundColor: colors.cream },
      ]}
    >
      <Image
        source={require("../../assets/brand/splash-art.jpg")}
        resizeMode="cover"
        style={{ position: "absolute", width: "100%", height: "100%" }}
        onLoadEnd={() => {
          setArtReady(true);
          SplashScreen.hide();
        }}
      />
      <View
        style={{
          alignItems: "center",
          paddingHorizontal: 32,
          paddingTop: "18%",
          gap: 20,
        }}
      >
        <Image
          source={require("../../assets/logo.png")}
          resizeMode="contain"
          style={{ width: "100%", maxWidth: 380, height: 170 }}
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
        <ActivityIndicator color={colors.gold} />
      </View>
    </View>
  );
}
