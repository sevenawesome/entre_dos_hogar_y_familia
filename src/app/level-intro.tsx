import { useState } from "react";
import { Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { LevelPresentation } from "../components/LevelPresentation";
import { levelIntroduction } from "../domain/level-news";
import { isUnlocked } from "../domain/progress";
import { acknowledgeLevelNews } from "../services/level-news";
import { friendlyError } from "../services/api";
import { Screen, Card, Notice, Button, s } from "../components/ui";
export default function LevelIntro() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const app = useApp(),
    level = app.levels.find((l) => l.id === levelId && l.published);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={() => router.back()}
      >
        <Text style={s.label}>← Volver</Text>
      </Pressable>
      {!level ? (
        <Notice text="Este nivel no está disponible en el catálogo actual." />
      ) : (
        <>
          <Card>
            <LevelPresentation info={levelIntroduction(level)} />
          </Card>
          <Notice
            text={
              isUnlocked(level, app.progress)
                ? "Este nivel está disponible en Nuestro camino. Allí podrán comenzar sus retos."
                : `Para comenzar, completen primero ${app.levels.find((l) => l.id === level.prerequisiteId)?.title ?? "el nivel anterior"}. Su presentación no adelanta los retos.`
            }
          />
          {!!error && <Notice error text={error} />}
          <Button
            title="Entendido, ver en Nuestro camino"
            busy={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await acknowledgeLevelNews(level.id);
                router.replace("/(tabs)/levels");
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </Screen>
  );
}
