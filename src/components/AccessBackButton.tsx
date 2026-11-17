import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, s } from "./ui";

export function AccessBackButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver a la pantalla anterior"
      disabled={disabled}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/welcome");
      }}
      style={[
        s.row,
        {
          minHeight: 44,
          alignSelf: "flex-start",
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Ionicons name="arrow-back" size={20} color={colors.ink} />
      <Text style={s.link}>Volver</Text>
    </Pressable>
  );
}
