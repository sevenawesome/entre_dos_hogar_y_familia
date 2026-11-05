import { useState } from "react";
import { Text, View, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useApp, store, actions } from "../store";
import { beginJourney } from "../services/actions";
import { registerDevice, loadPreferences } from "../services/notifications";
import { friendlyError } from "../services/api";
import type { Level } from "../domain/types";
import { Button, Notice, s } from "./ui";
export function StartJourneyCard({ level }: { level: Level }) {
  const { demo } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      const saved = await beginJourney(level.id);
      if (!demo && Platform.OS !== "web") {
        try {
          const prefs = await loadPreferences(),
            time = new Date(saved.startedAt);
          await registerDevice(
            {
              ...prefs,
              enabled: true,
              hour: time.getHours(),
              minute: time.getMinutes(),
            },
            true,
          );
        } catch (e) {
          store.dispatch(
            actions.error(
              `El recorrido ya comenzó. Para recibir avisos, revisa los permisos en Nosotros. ${friendlyError(e)}`,
            ),
          );
        }
      }
      router.push({
        pathname: "/challenge",
        params: { levelId: level.id, challengeId: level.challenges[0].id },
      });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <LinearGradient
      colors={["#C12968", "#7942AD"]}
      style={{ borderRadius: 28, padding: 25, gap: 18 }}
    >
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: "#FFFFFF26",
          borderRadius: 18,
          padding: 14,
        }}
      >
        <Text style={{ fontSize: 32, color: "white", fontWeight: "800" }}>
          01 ♡
        </Text>
      </View>
      <Text style={[s.eyebrow, { color: "#FFE8EF" }]}>
        AQUÍ EMPIEZA SU CAMINO
      </Text>
      <Text
        accessibilityRole="header"
        style={[s.title, { color: "white", fontSize: 32 }]}
      >
        Su primer paso empieza hoy.
      </Text>
      <Text style={[s.body, { color: "white" }]}>
        Pulsen cuando estén listos para hacer el primer reto. Este momento fija
        su horario: el siguiente período empieza mañana a la misma hora.
      </Text>
      <Button
        title="¡Comenzar nuestro primer reto!"
        icon="play"
        busy={busy}
        onPress={start}
      />
      <Text style={[s.small, { color: "#FFF1F6" }]}>
        Pediremos permiso para los avisos de este teléfono. Pueden cambiar su
        horario en Nosotros. Este botón aparece una sola vez por familia.
      </Text>
      {!!error && <Notice error text={error} />}
    </LinearGradient>
  );
}
