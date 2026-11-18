import { Text, View, Pressable } from "react-native";
import { useState } from "react";
import { SectionTabs } from "../components/SectionTabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useApp } from "../store";
import { Screen, Heading, Card, Button, colors, s } from "../components/ui";
export default function Memories() {
  const { levels, progress } = useApp();
  const [section, setSection] = useState<
    "challenges" | "levels" | "anniversaries"
  >("challenges");
  const finished = levels.filter((level) => progress[level.id]?.finishedAt);
  const memories = levels
    .flatMap((level) =>
      (progress[level.id]?.completions ?? []).map((completion) => ({
        level,
        completion,
        challenge: level.challenges.find(
          (c) => c.id === completion.challengeId,
        ),
      })),
    )
    .sort((a, b) =>
      b.completion.completedAt.localeCompare(a.completion.completedAt),
    );
  return (
    <Screen>
      <Button
        secondary
        title="Volver a Información"
        onPress={() =>
          router.replace({
            pathname: "/(tabs)/information",
            params: { section: "messages" },
          })
        }
      />
      <Heading
        eyebrow="SU HISTORIA, EN PEQUEÑOS MOMENTOS"
        title="Para volver a sentir."
      />
      <SectionTabs
        selected={section}
        options={[
          {
            id: "challenges",
            title: "Retos",
            icon: "heart-outline",
            description:
              "Sus momentos compartidos y las notas que escribieron juntos.",
            count: memories.length,
          },
          {
            id: "levels",
            title: "Logros",
            icon: "ribbon-outline",
            description: "Cada nivel conseguido y su reflexión final.",
            count: finished.length,
          },
          {
            id: "anniversaries",
            title: "Aniversarios",
            icon: "gift-outline",
            description:
              "Las felicitaciones de Comunidad, guardadas por año para volver a celebrarlas.",
          },
        ]}
        onSelect={setSection}
      />
      {section === "anniversaries" && (
        <Card style={{ backgroundColor: colors.champagne }}>
          <Text style={s.sectionTitle}>
            Las palabras que celebran su historia
          </Text>
          <Text style={s.body}>
            Las felicitaciones de Comunidad se guardan para ustedes, organizadas
            por aniversario.
          </Text>
          <Button
            secondary
            title="Recuerdos de nuestros aniversarios"
            onPress={() => router.push("/anniversary-memories")}
          />
        </Card>
      )}
      {section === "challenges" && !memories.length && (
        <Card style={{ alignItems: "center", paddingVertical: 40 }}>
          <Ionicons name="book-outline" size={46} color={colors.navy} />
          <Text style={s.sectionTitle}>Su historia empieza hoy</Text>
          <Text style={[s.body, { textAlign: "center" }]}>
            Después de su primer reto, encontrarán aquí el recuerdo de lo que
            compartieron.
          </Text>
          <Button
            secondary
            title="Ir al reto de hoy"
            onPress={() => router.push("/(tabs)")}
          />
        </Card>
      )}
      {section === "levels" && !finished.length && (
        <Card>
          <Text style={s.sectionTitle}>Cada paso acerca su primer logro</Text>
          <Text style={s.body}>
            Cuando completen los retos y la reflexión de un nivel, quedará
            guardado aquí.
          </Text>
        </Card>
      )}
      {section === "levels" &&
        finished.map((level) => (
          <Pressable
            key={level.id}
            onPress={() =>
              router.push({
                pathname: "/questionnaire",
                params: { levelId: level.id },
              })
            }
          >
            <Card style={{ backgroundColor: colors.sage }}>
              <View style={s.row}>
                <Ionicons name="ribbon-outline" size={28} color={colors.gold} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.label}>Nivel {level.order} conseguido</Text>
                  <Text style={s.body}>{level.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.ink} />
              </View>
              <Text style={s.small}>Leer nuestra reflexión final</Text>
            </Card>
          </Pressable>
        ))}
      {section === "challenges" &&
        memories.map(({ level, completion, challenge }) => (
          <Pressable
            key={`${level.id}-${completion.challengeId}`}
            onPress={() =>
              router.push({
                pathname: "/challenge",
                params: {
                  levelId: level.id,
                  challengeId: completion.challengeId,
                },
              })
            }
          >
            <Card>
              <Text style={s.eyebrow}>
                {new Date(completion.completedAt).toLocaleDateString("es", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <View style={s.row}>
                <Ionicons name="checkmark-circle" size={22} color="#7C9072" />
                <Text style={[s.sectionTitle, { flex: 1 }]}>
                  {challenge?.title ?? "Nuestro reto"}
                </Text>
              </View>
              {completion.note ? (
                <Text style={s.body}>{completion.note}</Text>
              ) : (
                <Text style={s.small}>Un momento que se regalaron juntos.</Text>
              )}
              <Text style={s.small}>
                Nivel {level.order} · Reto {challenge?.order}
              </Text>
            </Card>
          </Pressable>
        ))}
    </Screen>
  );
}
