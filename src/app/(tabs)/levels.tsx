import { useRef, useState } from "react";
import { View, Text, Pressable, type ScrollViewInstance } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useApp } from "../../store";
import { getJourney } from "../../domain/journey";
import { JourneyBanner } from "../../components/JourneyBanner";
import { SectionTabs } from "../../components/SectionTabs";
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
  const { levels, progress, catalogReady, progressReady } = useApp();
  const [section, setSection] = useState<
    "current" | "catalog" | "achievements"
  >("current");
  const [reviewLevelId, setReviewLevelId] = useState<string | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const journey = getJourney(levels, progress, catalogReady && progressReady);
  const reviewLevel = levels.find(
    (item) => item.id === reviewLevelId && isUnlocked(item, progress),
  );
  const currentId = reviewLevel?.id ?? journey.current?.id;
  const displayed = levels.filter((item) =>
    section === "catalog"
      ? true
      : section === "achievements"
        ? !!progress[item.id]?.finishedAt
        : item.id === currentId,
  );
  function showRetos(id: string) {
    setReviewLevelId(id);
    setSection("current");
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  return (
    <Screen scrollRef={scroll}>
      <Heading eyebrow="PASO A PASO, JUNTOS" title="Nuestro camino" />
      <SectionTabs
        selected={section}
        options={[
          {
            id: "current",
            title: "Mi nivel",
            icon: "heart-outline",
            description:
              "Su nivel actual y sus retos, paso a paso. No se trata de ir rápido: se trata de seguir eligiéndose.",
          },
          {
            id: "catalog",
            title: "Niveles",
            icon: "trail-sign-outline",
            description:
              "Descubran todos los capítulos publicados y lo que falta para desbloquearlos. Los nuevos niveles aparecen aquí sin instalar otra versión.",
            count: levels.length,
          },
          {
            id: "achievements",
            title: "Logros",
            icon: "ribbon-outline",
            description:
              "Los niveles que consiguieron y las reflexiones que forman parte de su historia.",
            count: journey.completed.length,
          },
        ]}
        onSelect={(key) => {
          setSection(key);
          setReviewLevelId(null);
          scroll.current?.scrollTo({ y: 0, animated: false });
        }}
      />
      {section === "current" && !journey.current && !reviewLevel && (
        <JourneyBanner />
      )}
      {section === "current" &&
        reviewLevel &&
        reviewLevel.id !== journey.current?.id && (
          <Button
            secondary
            title="Volver a nuestro nivel actual"
            onPress={() => setReviewLevelId(null)}
          />
        )}
      {displayed.map((level) => {
        const isCurrent = journey.current?.id === level.id;
        const unlocked = isUnlocked(level, progress),
          p = progress[level.id],
          finished = !!p?.finishedAt,
          current = currentChallenge(level, p);
        return (
          <View key={level.id} style={{ gap: 14 }}>
            <Card
              style={{
                opacity: unlocked ? 1 : 0.7,
                borderColor: isCurrent
                  ? colors.ocean
                  : finished
                    ? "#ACB99F"
                    : colors.line,
                borderWidth: isCurrent ? 2 : 1,
                backgroundColor: isCurrent ? colors.mist : colors.white,
              }}
            >
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text
                  style={[
                    s.tag,
                    isCurrent && {
                      backgroundColor: colors.ocean,
                      color: "#FFFFFF",
                    },
                  ]}
                >
                  {isCurrent
                    ? journey.state === "new"
                      ? "NUEVO · NIVEL DISPONIBLE"
                      : "ESTÁN AQUÍ · NIVEL ACTUAL"
                    : finished
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
                  color={finished ? colors.gold : colors.navy}
                />
              </View>
              <Text style={s.eyebrow}>
                NIVEL {level.order} · {level.challenges.length} RETOS
              </Text>
              <Text style={s.title}>{level.title}</Text>
              <Text style={s.body}>{level.description}</Text>
              <Button
                secondary
                title="Conocer de qué trata este nivel"
                onPress={() =>
                  router.push({
                    pathname: "/level-intro",
                    params: { levelId: level.id },
                  })
                }
              />
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
            {section !== "current" && unlocked && (
              <Button
                secondary
                title={
                  finished
                    ? "Ver los retos que compartimos"
                    : "Ver los retos de este nivel"
                }
                onPress={() => showRetos(level.id)}
              />
            )}
            {section === "current" && unlocked && (
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
                              ? colors.champagne
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
                              color: available ? colors.navy : colors.muted,
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
      {!catalogReady && <Notice text="Sincronizando los niveles publicados…" />}
      {catalogReady && !levels.length && (
        <Notice text="Todavía no hay niveles publicados." />
      )}
      {section === "achievements" && !journey.completed.length && (
        <Card>
          <Ionicons name="ribbon-outline" size={36} color={colors.gold} />
          <Text style={s.sectionTitle}>El primer logro los espera</Text>
          <Text style={s.body}>
            Completen los retos y la reflexión final de su nivel. Aquí quedará
            guardado cuando lo consigan.
          </Text>
          <Button
            title="Ver nuestro nivel"
            onPress={() => setSection("current")}
          />
        </Card>
      )}
      {section !== "current" && (
        <Card style={{ backgroundColor: colors.sage }}>
          <Ionicons name="leaf-outline" size={27} color="#6A7B60" />
          <Text style={s.sectionTitle}>La historia continúa</Text>
          <Text style={s.body}>
            Cuando llegue un nuevo nivel, lo encontrarán en este camino. Cada
            logro abre la puerta al siguiente.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
