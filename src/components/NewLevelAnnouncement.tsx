import { Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useApp } from "../store";
import { unreadLevelNews } from "../domain/level-news";
import { Button, gradients, s } from "./ui";
export function NewLevelAnnouncement() {
  const app = useApp();
  if (!app.catalogReady || !app.levelNewsReady) return null;
  const news = unreadLevelNews(app.levels, app.levelNewsRead),
    level = news[0];
  if (!level) return null;
  return (
    <LinearGradient
      colors={gradients.ocean}
      style={{ padding: 23, borderRadius: 25, gap: 14 }}
    >
      <Text style={[s.eyebrow, { color: "#F5D898" }]}>
        ¡LLEGÓ UN NIVEL NUEVO!
      </Text>
      <Text style={[s.sectionTitle, { color: "white" }]}>{level.title}</Text>
      <Text style={[s.body, { color: "#E2F1F3" }]}>
        Nivel {level.order} · {level.challenges.length}{" "}
        {level.challenges.length === 1 ? "nuevo reto" : "nuevos retos"} para
        seguir eligiéndose.{" "}
        {news.length > 1
          ? `Tienen ${news.length} novedades por descubrir.`
          : ""}
      </Text>
      <Button
        title="Conocer de qué trata"
        tone="love"
        onPress={() =>
          router.push({
            pathname: "/level-intro",
            params: { levelId: level.id },
          })
        }
      />
      <Text style={[s.small, { color: "#E2F1F3" }]}>
        Conozcan su presentación, aunque todavía estén completando un nivel
        anterior.
      </Text>
    </LinearGradient>
  );
}
