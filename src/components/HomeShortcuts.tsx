import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, s } from "./ui";

export type HomeSection =
  "challenge" | "progress" | "anniversary" | "birthdays" | "messages" | "news";
const shortcuts = [
  { id: "challenge", title: "Reto de hoy", icon: "heart-outline" },
  { id: "progress", title: "Mi progreso", icon: "trending-up-outline" },
  { id: "anniversary", title: "Aniversario", icon: "heart-circle-outline" },
  { id: "birthdays", title: "Cumpleaños", icon: "gift-outline" },
  { id: "messages", title: "Mensajes", icon: "mail-outline" },
  { id: "news", title: "Novedades", icon: "sparkles-outline" },
] as const;

export function HomeShortcuts({
  onSelect,
  messages,
  news,
}: {
  onSelect: (section: HomeSection) => void;
  messages: number;
  news: number;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.eyebrow}>¿QUÉ QUIEREN VER HOY?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {shortcuts.map((item) => {
          const count =
            item.id === "messages" ? messages : item.id === "news" ? news : 0;
          const love = item.id === "challenge";
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Ir a ${item.title}${count ? `, ${count} ${item.id === "news" ? "novedades" : "mensajes"}` : ""}`}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => ({
                flexBasis: "30%",
                flexGrow: 1,
                minWidth: 0,
                minHeight: 70,
                paddingHorizontal: 5,
                paddingVertical: 10,
                gap: 6,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: love ? colors.loveMist : colors.mist,
                borderWidth: 1,
                borderColor: love ? colors.loveLine : "#D3E4E8",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={love ? colors.love : colors.ocean}
                />
                {!!count && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: colors.love,
                    }}
                  >
                    {count > 99 ? "99+" : count}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: "700",
                  color: love ? colors.love : colors.ink,
                }}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!!news && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver los niveles nuevos"
          onPress={() => onSelect("news")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            padding: 12,
            borderRadius: 13,
            backgroundColor: colors.champagne,
          }}
        >
          <Ionicons name="sparkles" size={21} color={colors.gold} />
          <Text style={[s.label, { flex: 1 }]}>
            {news === 1 ? "¡Hay un nivel nuevo!" : "¡Hay nuevos niveles!"} Ver
            novedades
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.gold} />
        </Pressable>
      )}
      <Text style={s.small}>Toca una opción para ir directo a esa parte.</Text>
    </View>
  );
}
