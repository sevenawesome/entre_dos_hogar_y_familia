import { Text, View } from "react-native";
import type { Level } from "../domain/types";
import { Heading, Field, s } from "./ui";
export function QuestionnairePresentation({
  level,
  answers = {},
  onChange,
  preview = false,
}: {
  level: Level;
  answers?: Record<string, string>;
  onChange?: (id: string, value: string) => void;
  preview?: boolean;
}) {
  return (
    <>
      <Heading
        eyebrow={`NIVEL ${level.order} · REFLEXIÓN FINAL`}
        title="Lo mejor empieza ahora."
        subtitle="Reserven unos minutos para mirar atrás y responder juntos."
      />
      {level.questions.map((q, i) => (
        <View key={q.id} style={{ gap: 8 }}>
          <Text style={s.eyebrow}>
            PREGUNTA {i + 1} DE {level.questions.length}
          </Text>
          <Field
            label={q.label || "Pregunta final"}
            multiline
            value={answers[q.id] ?? ""}
            editable={!preview}
            maxLength={2000}
            onChangeText={(value) => onChange?.(q.id, value)}
            placeholder="Nuestra respuesta…"
          />
        </View>
      ))}
    </>
  );
}
