import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../../store";
import { useNow } from "../../components/useNow";
import { Brand } from "../../components/Brand";
import { Avatar } from "../../components/Avatar";
import { AnniversaryCard } from "../../components/AnniversaryCard";
import { BirthdaysCard } from "../../components/BirthdaysCard";
import { CreatorFooter } from "../../components/CreatorFooter";
import { JourneyBanner } from "../../components/JourneyBanner";
import { StartJourneyCard } from "../../components/StartJourneyCard";
import { EmailVerificationCard } from "../../components/EmailVerificationCard";
import {
  journeyStarted,
  journeyAvailableAt,
} from "../../domain/journey-timing";
import { getJourney } from "../../domain/journey";
import {
  canCompleteJourney,
  currentChallenge,
  percentage,
} from "../../domain/progress";
import {
  Screen,
  Card,
  Button,
  Ring,
  SectionTitle,
  Notice,
  colors,
  gradients,
  s,
  serif,
} from "../../components/ui";
export default function Today() {
  const {
    family,
    levels,
    progress,
    demo,
    settings,
    controls,
    catalogReady,
    progressReady,
    avatar,
    portraits,
    journey: started,
    journeyReady,
    emailVerified,
  } = useApp();
  const now = useNow();
  const { width } = useWindowDimensions();
  const [headerWidth, setHeaderWidth] = useState<number>();
  const logoWidth = Math.min(
    230,
    (((headerWidth ?? Math.min(width, 650) - 48) - 16) * 2) / 3,
  );
  const headerSize = logoWidth / 2;
  const journey = getJourney(levels, progress, catalogReady && progressReady);
  const level = journey.current;
  const p = level ? progress[level.id] : undefined;
  const challenge = level ? currentChallenge(level, p) : undefined;
  const waiting = !canCompleteJourney(progress, now);
  const needsStart =
    journeyReady && progressReady && !journeyStarted(progress, started);
  const availableAt = journeyAvailableAt(progress);
  const nextText = availableAt
    ? new Intl.DateTimeFormat("es", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(availableAt))
    : "24 horas después de completar el anterior";
  const total = Object.values(progress).reduce(
    (sum, item) => sum + item.completions.length,
    0,
  );
  const finished = Object.values(progress).filter(
    (item) => item.finishedAt,
  ).length;
  const date = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  return (
    <Screen>
      <View
        onLayout={(event) => setHeaderWidth(event.nativeEvent.layout.width)}
        style={[
          s.row,
          {
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          },
        ]}
      >
        <Brand compact frameSize={logoWidth} />
        <Pressable
          accessibilityLabel="Ver nuestro perfil"
          onPress={() => router.push("/(tabs)/family")}
          style={{
            width: headerSize,
            height: headerSize,
            flexShrink: 0,
            padding: 3,
            borderWidth: 1,
            borderColor: colors.sun,
            backgroundColor: colors.sage,
            borderRadius: headerSize / 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Avatar
            uri={avatar}
            name={family?.name ?? "Familia"}
            size={headerSize - 8}
          />
        </Pressable>
      </View>
      {demo && (
        <Notice text="Demostración · el progreso se guarda solo en este teléfono." />
      )}
      <View style={{ gap: 10, marginTop: 8 }}>
        <Text style={[s.eyebrow, { color: colors.muted, letterSpacing: 1.2 }]}>
          {date}
        </Text>
        <Text accessibilityRole="header" style={[s.title, { fontSize: 35 }]}>
          Hola, {family?.partner1}
          {"\n"}y {family?.partner2}{" "}
          <Text style={{ color: colors.navy }}>♡</Text>
        </Text>
        <Text style={s.body}>Hoy también es un buen día para elegirse.</Text>
      </View>
      {!!settings.announcement && <Notice text={settings.announcement} />}
      {needsStart && level && <StartJourneyCard level={level} />}
      {!emailVerified && <EmailVerificationCard />}
      {(!settings.notificationsEnabled || controls.remindersPaused) && (
        <Notice text="Los recordatorios están pausados por la administración. Pueden seguir completando sus retos." />
      )}
      <JourneyBanner />
      {level && !needsStart && journeyReady && (
        <View style={{ gap: 15 }}>
          <View
            style={[s.row, { justifyContent: "space-between", marginTop: 6 }]}
          >
            <Text style={s.eyebrow}>SU MOMENTO DE HOY</Text>
            <Text style={s.small}>
              NIVEL {level.order} · {p?.completions.length ?? 0}/
              {level.challenges.length}
            </Text>
          </View>
          <LinearGradient
            colors={gradients.sand}
            style={{
              borderRadius: 27,
              padding: 25,
              gap: 18,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                right: -32,
                top: -26,
                width: 168,
                height: 168,
                borderWidth: 1,
                borderColor: "#C7952740",
                borderRadius: 100,
              }}
            />
            <View
              style={{
                position: "absolute",
                right: -10,
                top: -5,
                width: 124,
                height: 124,
                borderWidth: 1,
                borderColor: "#C7952740",
                borderRadius: 100,
              }}
            />
            <View
              style={{
                backgroundColor: "#FFFFFF88",
                borderRadius: 17,
                height: 51,
                width: 51,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={challenge ? "sparkles-outline" : "ribbon-outline"}
                size={25}
                color={colors.navy}
              />
            </View>
            <Text style={s.eyebrow}>
              {challenge
                ? `RETO ${String(challenge.order).padStart(2, "0")} · ${challenge.stage}`
                : `${level.challenges.length} MOMENTOS, UNA HISTORIA`}
            </Text>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 32,
                lineHeight: 37,
                color: colors.ink,
                maxWidth: 290,
              }}
            >
              {challenge ? challenge.title : "Miren cuánto han crecido."}
            </Text>
            <Text style={[s.body, { color: "#375469" }]}>
              {challenge
                ? waiting
                  ? `Ya completaron su reto anterior. El siguiente se abre el ${nextText}.`
                  : challenge.description
                : "Cierren este capítulo con una reflexión juntos para conseguir el nivel."}
            </Text>
            {challenge && (
              <View style={s.row}>
                <Ionicons name="time-outline" color={colors.navy} size={16} />
                <Text style={[s.small, { color: "#506878" }]}>
                  {challenge.minutes} min sugeridos · Solo ustedes dos
                </Text>
              </View>
            )}
            <Button
              title={
                challenge
                  ? waiting
                    ? "Conocer el próximo reto"
                    : "Hagamos este reto"
                  : "Nuestra reflexión final"
              }
              onPress={() =>
                router.push({
                  pathname: challenge ? "/challenge" : "/questionnaire",
                  params: {
                    levelId: level.id,
                    ...(challenge ? { challengeId: challenge.id } : {}),
                  },
                })
              }
            />
          </LinearGradient>
        </View>
      )}
      {family && <AnniversaryCard family={family} now={now} />}
      {family && (
        <BirthdaysCard family={family} now={now} portraits={portraits} />
      )}
      <View>
        <SectionTitle right="Cada paso cuenta">Así vamos juntos</SectionTitle>
        <Card>
          <View style={s.row}>
            <Ring
              value={
                level
                  ? percentage(level, p)
                  : journey.state === "completed"
                    ? 100
                    : 0
              }
              label="DEL NIVEL"
            />
            <View style={{ flex: 1, gap: 7 }}>
              <Text
                style={{ fontFamily: serif, fontSize: 23, color: colors.ink }}
              >
                {level?.title ?? "Un amor que crece"}
              </Text>
              <Text style={s.body}>
                {total} {total === 1 ? "reto compartido" : "retos compartidos"}
              </Text>
              <Text style={[s.small, { color: colors.navy }]}>
                {finished}{" "}
                {finished === 1 ? "nivel conseguido" : "niveles conseguidos"}
              </Text>
            </View>
          </View>
          <View style={s.divider} />
          <Pressable
            onPress={() => router.push("/(tabs)/levels")}
            style={[s.row, { justifyContent: "space-between", minHeight: 32 }]}
          >
            <Text style={s.label}>Explorar nuestro camino</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.navy} />
          </Pressable>
        </Card>
      </View>
      <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
        <Ionicons name="leaf-outline" size={22} color="#89977E" />
        <Text
          style={[
            s.body,
            {
              fontFamily: serif,
              fontStyle: "italic",
              textAlign: "center",
              color: "#7A8374",
            },
          ]}
        >
          “Los pequeños gestos también{"\n"}construyen grandes historias.”
        </Text>
      </View>
      <CreatorFooter />
    </Screen>
  );
}
