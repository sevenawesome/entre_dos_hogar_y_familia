import { useState } from "react";
import { Image, Text, View } from "react-native";
import { colors } from "./ui";
export function Avatar({
  uri,
  name,
  size = 64,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return uri && uri !== failedUri ? (
    <Image
      source={{ uri }}
      onError={() => setFailedUri(uri)}
      accessibilityLabel={`Foto de ${name}`}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      accessible
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.blush,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ fontSize: size / 3, color: colors.rose, fontWeight: "700" }}
      >
        {name
          .split(" ")
          .slice(0, 2)
          .map((s) => s[0])
          .join("")
          .toUpperCase()}
      </Text>
    </View>
  );
}
