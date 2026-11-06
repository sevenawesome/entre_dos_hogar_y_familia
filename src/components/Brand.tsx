import { Image, Text, View } from "react-native";
import { colors } from "./ui";
export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/icon.png")}
      accessibilityLabel="Amor que permanece"
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      resizeMode="contain"
    />
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel="Amor que permanece. By Departamento de Hogar y Familia"
      style={{
        alignItems: "center",
        flexShrink: 1,
        width: compact ? 208 : "100%",
        maxWidth: 400,
        gap: compact ? 0 : 4,
      }}
    >
      <Image
        source={require("../../assets/logo.png")}
        accessible={false}
        resizeMode="contain"
        style={{ width: "100%", height: compact ? 99 : 150 }}
      />
      <Text
        style={{
          fontSize: compact ? 7.5 : 10,
          color: colors.ocean,
          fontWeight: "600",
          textAlign: "center",
          lineHeight: compact ? 12 : 16,
        }}
      >
        By Departamento de Hogar y Familia
      </Text>
    </View>
  );
}
