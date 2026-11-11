import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Challenge } from "../domain/types";
import { Heading, Card, colors, s, serif } from "./ui";
/** Shared by the real challenge screen and the administrator's phone preview. */
export function ChallengePresentation({
  challenge,
  levelOrder,
}: {
  challenge: Challenge;
  levelOrder: number;
}) {
  return (
    <>
      <Heading
        eyebrow={`NIVEL ${levelOrder} · RETO ${String(challenge.order).padStart(2, "0")}`}
        title={challenge.title || "Título del reto"}
        subtitle={challenge.stage || "Etapa del reto"}
      />
      <View style={[s.row, { marginTop: -12 }]}>
        <Ionicons name="time-outline" size={18} color={colors.navy} />
        <Text style={s.small}>{challenge.minutes} minutos sugeridos</Text>
        <Text style={s.small}>· A su ritmo</Text>
      </View>
      <Card>
        <Text style={[s.eyebrow, { color: colors.love }]}>
          LA INVITACIÓN DE HOY
        </Text>
        <Text
          style={[s.body, { fontSize: 18, lineHeight: 30, color: colors.ink }]}
        >
          {challenge.description || "La actividad del reto aparecerá aquí."}
        </Text>
      </Card>
      <Card
        style={{
          backgroundColor: colors.loveMist,
          borderColor: colors.loveLine,
        }}
      >
        <Ionicons name="chatbubbles-outline" size={25} color={colors.love} />
        <Text style={[s.eyebrow, { color: colors.love }]}>
          PARA CONVERSAR JUNTOS
        </Text>
        <Text
          style={{
            fontFamily: serif,
            fontSize: 25,
            lineHeight: 34,
            color: colors.ink,
          }}
        >
          {challenge.reflection || "Su pregunta para conversar aparecerá aquí."}
        </Text>
      </Card>
    </>
  );
}
