import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { bundledLevels } from "../data/catalog";
import { emptyProgress } from "../domain/progress";
import type { AppSettings, Level } from "../domain/types";
import { Card, colors, s } from "./ui";
import { JourneyBanner } from "./JourneyBanner";
export function AdminJourneyPreview({ settings }: { settings: AppSettings }) {
  const [mode, setMode] = useState<"active" | "completed" | "new">("active");
  const base = bundledLevels[0];
  const done = {
    ...emptyProgress(base.id),
    completions: base.challenges.map((c) => ({
      challengeId: c.id,
      completedAt: "2026-01-01T12:00:00Z",
      note: "",
    })),
    finishedAt: "2026-01-01T12:00:00Z",
  };
  const next: Level = {
    ...base,
    id: "preview-level-2",
    order: 2,
    title: "Un nuevo capítulo",
    prerequisiteId: base.id,
    challenges: Array.from({ length: 50 }, (_, i) => ({
      ...base.challenges[i % base.challenges.length],
      id: `preview-${i + 1}`,
      order: i + 1,
    })),
  };
  return (
    <Card>
      <Text style={s.sectionTitle}>Así lo verán las familias</Text>
      <Text style={s.small}>
        Vistas de ejemplo. No publican niveles ni cambian el progreso real. Los
        mensajes reflejan el formulario de configuración.
      </Text>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {(["active", "completed", "new"] as const).map((key) => (
          <Pressable
            accessibilityRole="button"
            key={key}
            onPress={() => setMode(key)}
            style={{
              backgroundColor: mode === key ? colors.ocean : colors.mist,
              borderRadius: 10,
              padding: 11,
            }}
          >
            <Text
              style={{
                color: mode === key ? "#FFFFFF" : colors.ocean,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {key === "active"
                ? "Nivel actual"
                : key === "completed"
                  ? "Sin más niveles"
                  : "Nivel nuevo"}
            </Text>
          </Pressable>
        ))}
      </View>
      <JourneyBanner
        preview={{
          settings,
          levels: mode === "new" ? [base, next] : [base],
          progress: mode === "active" ? {} : { [base.id]: done },
        }}
      />
    </Card>
  );
}
