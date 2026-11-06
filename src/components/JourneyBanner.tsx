import { Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../store";
import { getJourney } from "../domain/journey";
import { Button, Card, Notice, colors, gradients, s } from "./ui";
import type { Level, ProgressMap, AppSettings } from "../domain/types";
export function JourneyBanner({
  preview,
}: {
  preview?: { levels: Level[]; progress: ProgressMap; settings: AppSettings };
} = {}) {
  const app = useApp();
  const { levels, progress, settings } = preview ?? app;
  const journey = getJourney(
    levels,
    progress,
    preview ? true : app.catalogReady && app.progressReady,
  );
  if (journey.state === "loading")
    return <Notice text="Estamos preparando su camino…" />;
  if (journey.current)
    return (
      <LinearGradient
        colors={journey.state === "new" ? gradients.ocean : gradients.level}
        style={{ padding: 20, borderRadius: 23, gap: 13 }}
      >
        <View style={s.row}>
          <View
            style={{
              width: 54,
              height: 54,
              backgroundColor:
                journey.state === "new" ? "#FFFFFF20" : "#FFFFFFBB",
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: journey.state === "new" ? "#FFFFFF" : colors.ocean,
                fontWeight: "700",
                fontSize: 28,
              }}
            >
              {journey.current.order}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text
              style={[
                s.eyebrow,
                { color: journey.state === "new" ? "#FFE2A6" : colors.ocean },
              ]}
            >
              {journey.state === "new"
                ? "NUEVO · NIVEL DISPONIBLE"
                : "ESTÁN AQUÍ · NIVEL ACTUAL"}
            </Text>
            <Text
              style={[
                s.label,
                {
                  color: journey.state === "new" ? "#FFFFFF" : colors.ink,
                  fontSize: 19,
                  lineHeight: 25,
                },
              ]}
            >
              {journey.state === "new"
                ? settings.newLevelTitle
                : journey.current.title}
            </Text>
          </View>
        </View>
        {journey.state === "new" && (
          <Text style={{ color: "#E2F1F3", lineHeight: 22, fontSize: 14 }}>
            Nivel {journey.current.order}: {journey.current.title}.{" "}
            {journey.current.challenges.length} nuevos retos para seguir
            eligiéndose.
          </Text>
        )}
        <Button
          secondary
          disabled={!!preview}
          title={
            journey.state === "new"
              ? "Descubrir nuestro nuevo nivel"
              : "Ver nuestro nivel y progreso"
          }
          onPress={() =>
            journey.state === "new"
              ? router.push({
                  pathname: "/challenge",
                  params: {
                    levelId: journey.current!.id,
                    challengeId: journey.current!.challenges[0].id,
                  },
                })
              : router.push("/(tabs)/levels")
          }
        />
      </LinearGradient>
    );
  if (journey.state === "completed")
    return (
      <Card style={{ backgroundColor: colors.mist, borderColor: "#CBDDE0" }}>
        <Ionicons name="ribbon" size={44} color={colors.gold} />
        <Text style={s.eyebrow}>
          NIVEL {journey.latestCompleted?.order} CONSEGUIDO ·{" "}
          {journey.completed.length}{" "}
          {journey.completed.length === 1
            ? "LOGRO COMPARTIDO"
            : "LOGROS COMPARTIDOS"}
        </Text>
        <Text style={s.title}>{settings.endTitle}</Text>
        <Text style={s.body}>{settings.endMessage}</Text>
        <Button
          title="Volver a nuestros recuerdos"
          disabled={!!preview}
          onPress={() => router.push("/(tabs)/memories")}
        />
        <Button
          secondary
          title="Revisar los niveles conseguidos"
          disabled={!!preview}
          onPress={() => router.push("/(tabs)/levels")}
        />
      </Card>
    );
  return (
    <Card>
      <Ionicons name="leaf-outline" size={30} color={colors.ocean} />
      <Text style={s.sectionTitle}>
        {journey.state === "locked"
          ? "Su siguiente capítulo los espera"
          : "Su camino está por comenzar"}
      </Text>
      <Text style={s.body}>
        {journey.state === "locked"
          ? "Completen el nivel anterior y su reflexión final para abrir el próximo. Si su historial necesita revisión, contacten a soporte desde Información."
          : "Todavía no hay niveles publicados. Sus datos quedan guardados y el primero aparecerá aquí cuando esté disponible."}
      </Text>
      <Button
        secondary
        title="Ver nuestro camino"
        onPress={() => router.push("/(tabs)/levels")}
      />
    </Card>
  );
}
