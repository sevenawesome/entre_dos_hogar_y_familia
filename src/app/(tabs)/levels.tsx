import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useApp } from "../../store";
import {
  currentChallenge,
  isUnlocked,
  percentage,
} from "../../domain/progress";
import {
  Screen,
  Heading,
  Card,
  Ring,
  Button,
  Notice,
  colors,
  s,
} from "../../components/ui";
export default function Levels() {
  const { levels, progress } = useApp();
  return (
    <Screen>
      <Heading
        eyebrow="PASO A PASO, JUNTOS"
        title="Nuestro camino"
        subtitle="No se trata de ir rápido. Se trata de seguir eligiéndose."
      />
      {levels.map((level) => {
        const unlocked = isUnlocked(level, progress),
          p = progress[level.id],
          finished = !!p?.finishedAt,
          current = currentChallenge(level, p);
        return (
          <View key={level.id} style={{ gap: 14 }}>
            <Card
              style={{
                opacity: unlocked ? 1 : 0.7,
                borderColor: finished ? "#ACB99F" : colors.line,
              }}
            >
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={s.tag}>
                  {finished
                    ? "CONSEGUIDO"
                    : !unlocked
                      ? "POR DESBLOQUEAR"
                      : p?.completions.length
                        ? "EN CAMINO"
                        : "NUEVO CAPÍTULO"}
                </Text>
                <Ionicons
                  name={
                    finished
                      ? "ribbon"
                      : unlocked
                        ? "heart-outline"
                        : "lock-closed-outline"
                  }
                  size={26}
                  color={finished ? colors.gold : colors.rose}
                />
              </View>
              <Text style={s.eyebrow}>
                NIVEL {level.order} · {level.challenges.length} RETOS
              </Text>
              <Text style={s.title}>{level.title}</Text>
              <Text style={s.body}>{level.description}</Text>
              <View style={s.row}>
                <Ring size={70} value={percentage(level, p)} />
                <Text style={[s.body, { flex: 1 }]}>
                  {finished
                    ? "Un logro que ya es parte de su historia."
                    : unlocked
                      ? `${p?.completions.length ?? 0} de ${level.challenges.length} momentos compartidos`
                      : `Completen ${levels.find((l) => l.id === level.prerequisiteId)?.title ?? "el nivel anterior"} para empezar.`}
                </Text>
              </View>
              {unlocked && !finished && (
                <Button
                  title={
                    current
                      ? "Continuar nuestro camino"
                      : "Completar reflexión final"
                  }
                  onPress={() =>
                    router.push({
                      pathname: current ? "/challenge" : "/questionnaire",
                      params: {
                        levelId: level.id,
                        ...(current ? { challengeId: current.id } : {}),
                      },
                    })
                  }
                />
              )}
              {finished && (
                <Button
                  secondary
                  title="Leer nuestra reflexión"
                  onPress={() =>
                    router.push({
                      pathname: "/questionnaire",
                      params: { levelId: level.id },
                    })
                  }
                />
              )}
            </Card>
            {unlocked && (
              <View style={{ paddingHorizontal: 6 }}>
                {level.challenges.map((challenge) => {
                  const done = p?.completions.some(
                      (c) => c.challengeId === challenge.id,
                    ),
                    available = done || current?.id === challenge.id;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !available }}
                      disabled={!available}
                      key={challenge.id}
                      onPress={() =>
                        router.push({
                          pathname: "/challenge",
                          params: {
                            levelId: level.id,
                            challengeId: challenge.id,
                          },
                        })
                      }
                      style={[
                        s.row,
                        {
                          paddingVertical: 15,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.line,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: done
                            ? colors.sage
                            : available
                              ? colors.blush
                              : "#EEEDE7",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {done ? (
                          <Ionicons
                            name="checkmark"
                            color="#687B5B"
                            size={18}
                          />
                        ) : (
                          <Text
                            style={{
                              color: available ? colors.rose : colors.muted,
                              fontSize: 12,
                            }}
                          >
                            {String(challenge.order).padStart(2, "0")}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={[
                            s.label,
                            !available && { color: colors.muted },
                          ]}
                        >
                          {challenge.title}
                        </Text>
                        <Text style={s.small}>{challenge.stage}</Text>
                      </View>
                      <Ionicons
                        name={
                          available ? "chevron-forward" : "lock-closed-outline"
                        }
                        size={16}
                        color={colors.muted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      {!levels.length && <Notice text="Todavía no hay niveles publicados." />}
      <Card style={{ backgroundColor: colors.sage }}>
        <Ionicons name="leaf-outline" size={27} color="#6A7B60" />
        <Text style={s.sectionTitle}>La historia continúa</Text>
        <Text style={s.body}>
          Cuando llegue un nuevo nivel, lo encontrarán en este camino. Cada
          logro abre la puerta al siguiente.
        </Text>
      </Card>
    </Screen>
  );
}
