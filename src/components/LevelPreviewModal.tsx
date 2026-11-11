import { useState } from "react";
import { Modal, Text, View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Level } from "../domain/types";
import { levelIntroduction } from "../domain/level-news";
import { LevelPresentation } from "./LevelPresentation";
import { ChallengePresentation } from "./ChallengePresentation";
import { QuestionnairePresentation } from "./QuestionnairePresentation";
import { Screen, Card, Button, Field, Notice, colors, s } from "./ui";
export function LevelPreviewModal({
  level,
  challengeIndex,
  onClose,
}: {
  level: Level;
  challengeIndex: number;
  onClose: () => void;
}) {
  const [screen, setScreen] = useState<"intro" | "challenge" | "questions">(
    "intro",
  );
  const [at, setAt] = useState(challengeIndex);
  const challenge = level.challenges[at] ?? level.challenges[0];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "#06264AC9",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 480,
            height: "92%",
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: colors.background,
          }}
        >
          <Screen>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.eyebrow}>VISTA PREVIA · SIN GUARDAR AVANCES</Text>
            </View>
            <Button
              secondary
              title="Cerrar vista previa"
              icon="close"
              onPress={onClose}
            />
            <View style={[s.row, { flexWrap: "wrap" }]}>
              {(
                [
                  ["intro", "Presentación"],
                  ["challenge", "Reto"],
                  ["questions", "Cuestionario"],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: screen === key }}
                  onPress={() => setScreen(key)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: screen === key ? colors.navy : colors.mist,
                  }}
                >
                  <Text
                    style={{
                      color: screen === key ? "white" : colors.ink,
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {screen === "intro" && (
              <>
                <Card>
                  <LevelPresentation info={levelIntroduction(level)} />
                </Card>
                <Notice text="La pareja verá esta presentación sin adelantar las actividades de los retos." />
                <Button
                  title="Entendido, ver en Nuestro camino"
                  disabled
                  onPress={() => {}}
                />
              </>
            )}
            {screen === "challenge" && challenge && (
              <>
                <View style={s.row}>
                  <Button
                    secondary
                    title="Anterior"
                    disabled={at === 0}
                    onPress={() => setAt(at - 1)}
                  />
                  <Text style={s.small}>
                    {at + 1} / {level.challenges.length}
                  </Text>
                  <Button
                    secondary
                    title="Siguiente"
                    disabled={at >= level.challenges.length - 1}
                    onPress={() => setAt(at + 1)}
                  />
                </View>
                <ChallengePresentation
                  challenge={challenge}
                  levelOrder={level.order}
                />
                <Field
                  label="Algo que queremos recordar · opcional"
                  placeholder="¿Cómo se sintieron? ¿Qué se llevan de hoy?"
                  multiline
                  editable={false}
                />
                <View style={[s.row, { paddingVertical: 10 }]}>
                  <Ionicons
                    name="square-outline"
                    size={26}
                    color={colors.navy}
                  />
                  <Text style={[s.body, { flex: 1, fontSize: 14 }]}>
                    Ambos participamos y estamos de acuerdo en marcarlo como
                    completado.
                  </Text>
                </View>
                <Button
                  title="Lo hicimos juntos"
                  tone="love"
                  disabled
                  onPress={() => {}}
                />
              </>
            )}
            {screen === "questions" && (
              <>
                <QuestionnairePresentation level={level} preview />
                <Button
                  title="Conseguir este nivel"
                  icon="ribbon-outline"
                  disabled
                  onPress={() => {}}
                />
              </>
            )}
          </Screen>
        </View>
      </View>
    </Modal>
  );
}
