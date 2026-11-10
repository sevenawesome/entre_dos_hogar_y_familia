import React, { type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle } from "react-native-svg";
export const colors = {
  background: "#FBF7EE",
  ink: "#06264A",
  muted: "#596C79",
  sage: "#E5F2EE",
  line: "#E5DFCF",
  white: "#FFFFFF",
  gold: "#A77819",
  mist: "#E7F2F4",
  navy: "#06264A",
  ocean: "#1D6075",
  sea: "#5AAEBB",
  cream: "#FBF7EE",
  champagne: "#F7ECD2",
  sun: "#C79527",
};
export const gradients = {
  ocean: ["#06264A", "#14536B"],
  celebration: ["#0A3456", "#1D6075"],
  sand: ["#FAE8BE", "#F9F2E2", "#E0F0F2"],
  level: ["#E2F1F3", "#F7ECD2"],
} as const;
export const serif =
  Platform.OS === "ios"
    ? "Georgia"
    : Platform.OS === "web"
      ? "Georgia, serif"
      : "serif";
export function Screen({
  children,
  scroll = true,
}: PropsWithChildren<{ scroll?: boolean }>) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={s.content}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 9, marginBottom: 26 }}>
      {!!eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      {!!subtitle && <Text style={s.body}>{subtitle}</Text>}
    </View>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Button({
  title,
  onPress,
  secondary,
  disabled,
  busy,
  icon,
  danger,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && { backgroundColor: "#A52D3D" },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.ink : "#fff"} />
      ) : (
        <>
          {!!icon && (
            <Ionicons
              name={icon}
              size={19}
              color={secondary ? colors.ink : "#fff"}
            />
          )}
          <Text style={[s.buttonText, secondary && { color: colors.ink }]}>
            {title}
          </Text>
          {!secondary && (
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          )}
        </>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#92998F"
        style={[
          s.input,
          props.multiline && { minHeight: 106, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <View
      accessibilityRole={error ? "alert" : undefined}
      style={[s.notice, error && { backgroundColor: "#FBE8E1" }]}
    >
      <Ionicons
        name={error ? "alert-circle-outline" : "information-circle-outline"}
        size={20}
        color={colors.navy}
      />
      <Text style={[s.small, { flex: 1, color: colors.ink }]}>{text}</Text>
    </View>
  );
}
export function Ring({
  value,
  size = 110,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const radius = (size - 12) / 2,
    circumference = 2 * Math.PI * radius;
  return (
    <View
      accessible
      accessibilityLabel={`${value}% completado`}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E9E8DF"
          strokeWidth={7}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.gold}
          strokeWidth={7}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - value / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text
        style={{ fontSize: size / 4.3, fontWeight: "600", color: colors.ink }}
      >
        {value}%
      </Text>
      {!!label && (
        <Text style={{ fontSize: 10, color: colors.muted, marginTop: 3 }}>
          {label}
        </Text>
      )}
    </View>
  );
}
export function SectionTitle({
  children,
  right,
}: PropsWithChildren<{ right?: string }>) {
  return (
    <View
      style={[s.row, { justifyContent: "space-between", marginBottom: 16 }]}
    >
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {children}
      </Text>
      {right && <Text style={s.small}>{right}</Text>}
    </View>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 24,
    paddingBottom: 36,
    width: "100%",
    maxWidth: 650,
    alignSelf: "center",
    gap: 20,
  },
  title: { fontFamily: serif, fontSize: 36, lineHeight: 42, color: colors.ink },
  eyebrow: {
    color: colors.navy,
    fontSize: 11,
    letterSpacing: 2.1,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  body: { color: colors.muted, fontSize: 15, lineHeight: 24 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  button: {
    minHeight: 54,
    backgroundColor: colors.navy,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  secondary: { backgroundColor: colors.sage },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionTitle: { fontFamily: serif, fontSize: 23, color: colors.ink },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: colors.champagne,
    borderRadius: 14,
  },
  divider: { height: 1, backgroundColor: colors.line },
  link: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 10,
  },
  tag: {
    color: colors.navy,
    backgroundColor: colors.champagne,
    alignSelf: "flex-start",
    borderRadius: 8,
    overflow: "hidden",
    fontSize: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
    letterSpacing: 1,
    fontWeight: "700",
  },
});
