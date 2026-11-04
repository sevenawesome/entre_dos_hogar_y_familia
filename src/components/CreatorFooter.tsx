import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { openURL } from "expo-linking";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, s } from "./ui";
export function CreatorFooter() {
  const [error, setError] = useState(false);
  return (
    <View style={{ alignItems: "center", gap: 5, paddingVertical: 12 }}>
      <Text style={s.small}>Creado por</Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="SevenAwesome. Visitar su página web"
        onPress={() => {
          openURL("https://www.sevenawesome.com/").catch(() => setError(true));
        }}
        style={[s.row, { gap: 6, minHeight: 44 }]}
      >
        <Text style={{ fontWeight: "700", fontSize: 17, color: colors.violet }}>
          SevenAwesome
        </Text>
        <Ionicons name="open-outline" size={15} color={colors.violet} />
      </Pressable>
      {error && (
        <Text style={s.small}>
          Visita www.sevenawesome.com desde tu navegador.
        </Text>
      )}
    </View>
  );
}
