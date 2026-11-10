import { useApp } from "../store";
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
export function Brand({
  compact = false,
  byline: override,
  frameSize,
}: {
  compact?: boolean;
  byline?: string;
  frameSize?: number;
}) {
  const { branding } = useApp();
  const byline = override ?? branding.byline;
  return (
    <View
      accessible
      accessibilityLabel={`Amor que permanece${byline ? `. ${byline}` : ""}`}
      style={{
        alignItems: "center",
        flexShrink: 1,
        width: frameSize ?? (compact ? 208 : "100%"),
        maxWidth: 400,
        gap: compact ? 2 : 4,
      }}
    >
      <Image
        source={require("../../assets/logo.png")}
        accessible={false}
        resizeMode="contain"
        style={{
          width: "100%",
          height: frameSize ? frameSize / 2 : compact ? 104 : 150,
        }}
      />
      {!!byline && (
        <Text
          style={{
            fontSize: compact ? 7.5 : 10,
            color: colors.ocean,
            fontWeight: "600",
            textAlign: "center",
            lineHeight: compact ? 12 : 16,
          }}
        >
          {byline}
        </Text>
      )}
    </View>
  );
}
