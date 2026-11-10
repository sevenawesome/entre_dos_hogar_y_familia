import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { LevelIntroduction } from "../domain/level-news";
import { colors, s } from "./ui";
export function LevelPresentation({ info }: { info: LevelIntroduction }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={s.row}>
        <Ionicons name="gift-outline" size={28} color={colors.love} />
        <Text style={[s.eyebrow, { color: colors.love }]}>
          NIVEL {info.order} · UN NUEVO CAPÍTULO
        </Text>
      </View>
      <Text style={s.title}>
        {info.title || "El título de su próximo capítulo"}
      </Text>
      <Text style={s.sectionTitle}>
        {info.subtitle || "Su invitación para las parejas aparecerá aquí."}
      </Text>
      <Text style={s.body}>
        {info.description ||
          "Describe aquí de qué trata este nivel, sin adelantar las actividades de los retos."}
      </Text>
      <Text style={s.label}>
        {info.challengeCount} {info.challengeCount === 1 ? "reto" : "retos"} ·{" "}
        {info.questionCount}{" "}
        {info.questionCount === 1 ? "pregunta" : "preguntas"} para cerrar el
        nivel
      </Text>
    </View>
  );
}
