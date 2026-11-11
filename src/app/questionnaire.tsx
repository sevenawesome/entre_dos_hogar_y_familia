import { useState } from "react";
import { Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "../store";
import { currentChallenge, isUnlocked } from "../domain/progress";
import { finishLevel } from "../services/actions";
import { friendlyError } from "../services/api";
import {
  Screen,
  Heading,
  Button,
  Notice,
  Card,
  colors,
  s,
} from "../components/ui";
import { QuestionnairePresentation } from "../components/QuestionnairePresentation";
export default function Questionnaire() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const { levels, progress } = useApp();
  const level = levels.find((l) => l.id === levelId),
    p = progress[levelId];
  const [answers, setAnswers] = useState<Record<string, string>>(
      p?.answers ?? {},
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const finished = !!p?.finishedAt;
  async function save() {
    setBusy(true);
    try {
      await finishLevel(levelId, answers);
      router.replace("/(tabs)");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Pressable
        accessibilityLabel="Volver"
        onPress={() => router.back()}
        style={{ paddingVertical: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.ink} />
      </Pressable>
      {finished && (
        <Heading
          eyebrow={`NIVEL ${level?.order ?? ""} · REFLEXIÓN FINAL`}
          title="Lo que construimos."
          subtitle="Reserven unos minutos para mirar atrás y responder juntos."
        />
      )}
      {!level || !isUnlocked(level, progress) || currentChallenge(level, p) ? (
        <Notice text="Completen todos los retos de este nivel para abrir su reflexión final." />
      ) : (
        <>
          {finished && (
            <Notice
              text={`Nivel conseguido el ${new Date(p!.finishedAt!).toLocaleDateString("es")}. Sus respuestas quedaron guardadas.`}
            />
          )}
          {finished ? (
            level.questions.map((q, i) => (
              <Card key={q.id}>
                <Text style={s.eyebrow}>RECUERDO {i + 1}</Text>
                <Text style={s.label}>{q.label}</Text>
                <Text style={s.body}>{p?.answers[q.id]}</Text>
              </Card>
            ))
          ) : (
            <QuestionnairePresentation
              level={level}
              answers={answers}
              onChange={(id, value) => setAnswers({ ...answers, [id]: value })}
            />
          )}
          {!!error && <Notice text={error} error />}
          {!finished && (
            <Button
              title="Conseguir este nivel"
              icon="ribbon-outline"
              disabled={level.questions.some((q) => !answers[q.id]?.trim())}
              busy={busy}
              onPress={save}
            />
          )}
        </>
      )}
    </Screen>
  );
}
