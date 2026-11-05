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
import { journeyStarted } from "../domain/journey-timing";
import { friendlyError } from "../services/api";
import {
  Screen,
  Heading,
  Card,
  Field,
  Button,
  Notice,
  colors,
  s,
  serif,
} from "../components/ui";
export default function Challenge() {
  const { levelId, challengeId } = useLocalSearchParams<{
    levelId: string;
    challengeId: string;
  }>();
  const { levels, progress, journey } = useApp();
  const now = useNow();
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
    canCompleteJourney(progress, now, journey?.startedAt);
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
        <Notice text="Para empezar y activar el horario diario, pulsen «Comenzar nuestro primer reto» en Hoy." />
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
              backgroundColor: colors.sage,
              padding: 30,
              borderRadius: 80,
            }}
          >
            <Ionicons name="heart" size={58} color={colors.rose} />
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
          <Heading
            eyebrow={`NIVEL ${level.order} · RETO ${String(challenge.order).padStart(2, "0")}`}
            title={challenge.title}
            subtitle={challenge.stage}
          />
          <View style={[s.row, { marginTop: -12 }]}>
            <Ionicons name="time-outline" size={18} color={colors.rose} />
            <Text style={s.small}>{challenge.minutes} minutos sugeridos</Text>
            <Text style={s.small}>·</Text>
            <Text style={s.small}>A su ritmo</Text>
          </View>
          <Card>
            <Text style={s.eyebrow}>LA INVITACIÓN DE HOY</Text>
            <Text
              style={[
                s.body,
                { fontSize: 18, lineHeight: 30, color: colors.ink },
              ]}
            >
              {challenge.description}
            </Text>
          </Card>
          <Card
            style={{ backgroundColor: colors.sage, borderColor: colors.sage }}
          >
            <Ionicons name="chatbubbles-outline" size={25} color="#6F8066" />
            <Text style={s.eyebrow}>PARA CONVERSAR JUNTOS</Text>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 25,
                lineHeight: 34,
                color: colors.ink,
              }}
            >
              {challenge.reflection}
            </Text>
          </Card>
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
                  color={colors.rose}
                />
                <Text style={[s.body, { flex: 1, fontSize: 14 }]}>
                  Ambos participamos y estamos de acuerdo en marcarlo como
                  completado.
                </Text>
              </Pressable>
              {!allowed && (
                <Notice
                  text={
                    isUnlocked(level, progress) &&
                    currentChallenge(level, p)?.id === challenge.id
                      ? "Su próximo reto se abre 24 horas después del anterior. Disfruten lo que ya compartieron."
                      : "Completen primero los retos anteriores para llegar a este momento."
                  }
                />
              )}
              {!!error && <Notice error text={error} />}
              <Button
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
