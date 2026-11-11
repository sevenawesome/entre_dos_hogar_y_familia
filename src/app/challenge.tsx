import { ChallengePresentation } from "../components/ChallengePresentation";
import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../store";
import { useNow } from "../components/useNow";
import {
  canCompleteJourney,
  currentChallenge,
  isUnlocked,
} from "../domain/progress";
import { completeChallenge } from "../services/actions";
import {
  journeyStarted,
  journeyAvailableAt,
  remainingChallengeMinutes,
} from "../domain/journey-timing";
import { friendlyError } from "../services/api";
import {
  Screen,
  Card,
  Field,
  Button,
  Notice,
  colors,
  s,
} from "../components/ui";
export default function Challenge() {
  const { levelId, challengeId } = useLocalSearchParams<{
    levelId: string;
    challengeId: string;
  }>();
  const { levels, progress, journey } = useApp();
  const availableAt = journeyAvailableAt(progress);
  const now = useNow(availableAt);
  const waitMinutes = remainingChallengeMinutes(availableAt, now);
  const level = levels.find((l) => l.id === levelId),
    challenge = level?.challenges.find((c) => c.id === challengeId),
    p = progress[levelId],
    completion = p?.completions.find((c) => c.challengeId === challengeId);
  const [note, setNote] = useState(""),
    [agreed, setAgreed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [celebrating, setCelebrating] = useState(false);
  const allowed =
    !!level &&
    journeyStarted(progress, journey) &&
    isUnlocked(level, progress) &&
    currentChallenge(level, p)?.id === challengeId &&
    canCompleteJourney(progress, now);
  async function complete() {
    setBusy(true);
    try {
      await completeChallenge(levelId, challengeId, note);
      setCelebrating(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      {!journeyStarted(progress, journey) && (
        <Notice text="Pulsen «Comenzar nuestro primer reto» en Hoy para empezar de inmediato." />
      )}
      <Pressable
        accessibilityLabel="Volver"
        onPress={() => router.back()}
        style={[s.row, { paddingVertical: 9 }]}
      >
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
        <Text style={s.label}>Nuestro momento</Text>
      </Pressable>
      {!challenge || !level ? (
        <Notice text="No encontramos este reto en el catálogo actual." />
      ) : celebrating ? (
        <View style={{ gap: 24, paddingTop: 40, alignItems: "center" }}>
          <View
            style={{
              backgroundColor: colors.loveMist,
              padding: 30,
              borderRadius: 80,
            }}
          >
            <Ionicons name="heart" size={58} color={colors.love} />
          </View>
          <Text style={[s.title, { textAlign: "center" }]}>
            Un poquito más cerca.
          </Text>
          <Text style={[s.body, { textAlign: "center" }]}>
            Guardamos este momento en su historia. Gracias por darse tiempo para
            ustedes.
          </Text>
          <Button
            title="Volver a nuestro espacio"
            onPress={() => router.back()}
          />
        </View>
      ) : (
        <>
          <ChallengePresentation
            challenge={challenge}
            levelOrder={level.order}
          />
          {completion ? (
            <>
              <Notice
                text={`Completado el ${new Date(completion.completedAt).toLocaleDateString("es")}. Este momento ya es parte de su historia.`}
              />
              {!!completion.note && (
                <Card>
                  <Text style={s.eyebrow}>SU RECUERDO</Text>
                  <Text style={s.body}>{completion.note}</Text>
                </Card>
              )}
            </>
          ) : (
            <>
              <Field
                label="Algo que queremos recordar · opcional"
                placeholder="¿Cómo se sintieron? ¿Qué se llevan de hoy?"
                multiline
                maxLength={2000}
                value={note}
                onChangeText={setNote}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                onPress={() => setAgreed(!agreed)}
                style={[s.row, { paddingVertical: 10 }]}
              >
                <Ionicons
                  name={agreed ? "checkbox" : "square-outline"}
                  size={26}
                  color={colors.navy}
                />
                <Text style={[s.body, { flex: 1, fontSize: 14 }]}>
                  Ambos participamos y estamos de acuerdo en marcarlo como
                  completado.
                </Text>
              </Pressable>
              {!allowed &&
              waitMinutes > 0 &&
              journeyStarted(progress, journey) &&
              isUnlocked(level, progress) &&
              currentChallenge(level, p)?.id === challenge.id ? (
                <Card
                  style={{
                    backgroundColor: colors.loveMist,
                    borderColor: colors.love,
                  }}
                >
                  <Text style={s.eyebrow}>UN MOMENTO PARA CADA DÍA</Text>
                  <Text style={[s.sectionTitle, { color: colors.love }]}>
                    {waitMinutes === 1 ? "Falta" : "Faltan"}{" "}
                    {new Intl.NumberFormat("es").format(waitMinutes)}{" "}
                    {waitMinutes === 1 ? "minuto" : "minutos"}
                  </Text>
                  <Text style={s.body}>
                    «Lo hicimos juntos» se habilitará el{" "}
                    {new Intl.DateTimeFormat("es", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(availableAt!))}
                    , 24 horas después del reto anterior.
                  </Text>
                  <Text style={s.small}>
                    Con los avisos activados en este teléfono, les recordaremos
                    cuando esté disponible. Al tocar el aviso abrirán su reto
                    pendiente.
                  </Text>
                </Card>
              ) : (
                !allowed && (
                  <Notice
                    text={
                      isUnlocked(level, progress) &&
                      currentChallenge(level, p)?.id === challenge.id
                        ? "Su próximo reto se abre 24 horas después de completar el anterior. Disfruten lo que ya compartieron."
                        : "Completen primero los retos anteriores para llegar a este momento."
                    }
                  />
                )
              )}
              {!!error && <Notice error text={error} />}
              <Button
                tone="love"
                title="Lo hicimos juntos"
                icon="heart-outline"
                onPress={complete}
                disabled={!allowed || !agreed}
                busy={busy}
              />
            </>
          )}
          <Text style={[s.small, { textAlign: "center" }]}>
            Pueden adaptar cada propuesta. El consentimiento y el bienestar de
            ambos siempre van primero.
          </Text>
        </>
      )}
    </Screen>
  );
}
