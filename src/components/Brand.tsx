import { useId } from "react";
import { Text, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
} from "react-native-svg";
import { colors, serif } from "./ui";
export function BrandMark({ size = 48 }: { size?: number }) {
  const gradientId = `brand-${useId().replace(/:/g, "")}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="100%" y2="100%">
          <Stop offset="0" stopColor="#FF7864" />
          <Stop offset="1" stopColor="#C12968" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill={`url(#${gradientId})`} />
      <Path
        d="M50 73 C37 64 22 54 22 41 C22 25 43 25 50 38 C57 25 78 25 78 41 C78 54 63 64 50 73Z"
        fill="none"
        stroke="white"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <Path
        d="M35 50 C40 43 46 43 50 50 C54 57 60 57 65 50 C60 43 54 43 50 50 C46 57 40 57 35 50Z"
        fill="none"
        stroke="#FFE4A5"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel="Entre dos. By Departamento de Hogar y Familia"
      style={{
        flexDirection: "row",
        gap: compact ? 9 : 13,
        alignItems: "center",
        flexShrink: 1,
      }}
    >
      <BrandMark size={compact ? 43 : 60} />
      <View style={{ gap: 2, flexShrink: 1 }}>
        <Text
          style={{
            fontFamily: serif,
            fontSize: compact ? 23 : 31,
            lineHeight: compact ? 31 : 44,
            color: colors.ink,
            letterSpacing: -0.8,
          }}
        >
          ENTRE DOS
        </Text>
        <Text
          style={{
            fontSize: compact ? 8 : 10,
            color: colors.rose,
            fontWeight: "600",
            lineHeight: compact ? 13 : 17,
          }}
        >
          By Departamento de Hogar y Familia
        </Text>
      </View>
    </View>
  );
}
