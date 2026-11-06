import { Text, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { openURL } from "expo-linking";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { useApp } from "../store";
import { milestoneFor, milestoneTitle } from "../data/anniversaries";
import { Screen, Heading, Card, Notice, colors, s } from "../components/ui";
export default function AnniversaryDetails() {
  const { year } = useLocalSearchParams<{ year?: string }>();
  const { anniversaryCatalog: catalog } = useApp();
  const [error, setError] = useState(false);
  const requested = Number(year);
  const selectedYear =
    Number.isInteger(requested) && requested >= 0 && requested <= 999
      ? requested
      : null;
  const milestone =
    selectedYear === null ? null : milestoneFor(catalog, selectedYear);
  return (
    <Screen key={year ?? "catalog"}>
      <Pressable
        accessibilityLabel="Volver"
        onPress={() => router.back()}
        style={[s.row, { minHeight: 40 }]}
      >
        <Ionicons name="arrow-back" size={23} color={colors.ink} />
        <Text style={s.label}>Nuestra historia</Text>
      </Pressable>
      <Heading
        eyebrow="UN SIGNIFICADO PARA CADA ETAPA"
        title={
          milestone
            ? milestoneTitle(milestone.material, milestone.year)
            : "Cada año tiene su historia."
        }
        subtitle={
          milestone
            ? milestone.year === 0
              ? "Antes del primer aniversario"
              : `${milestone.year} ${milestone.year === 1 ? "año" : "años"} de matrimonio`
            : `${catalog.milestones.length} categorías para descubrir juntos.`
        }
      />
      {milestone && (
        <>
          <Card style={{ backgroundColor: colors.mist }}>
            <Ionicons name="sparkles-outline" size={30} color={colors.ocean} />
            <Text style={s.eyebrow}>QUÉ PUEDE REPRESENTAR</Text>
            <Text
              style={[
                s.body,
                { color: colors.ink, fontSize: 17, lineHeight: 28 },
              ]}
            >
              {milestone.meaning}
            </Text>
          </Card>
          <Card>
            <Text style={s.eyebrow}>UNA INVITACIÓN DE Amor que permanece</Text>
            <Text style={s.body}>{milestone.invitation}</Text>
          </Card>
        </>
      )}
      <Notice text={catalog.note} />
      <Text style={s.sectionTitle}>Explorar las bodas por año</Text>
      <View style={{ gap: 9 }}>
        {catalog.milestones.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.year}
            onPress={() => router.setParams({ year: String(item.year) })}
            style={[
              s.row,
              {
                borderWidth: 1,
                borderColor:
                  selectedYear === item.year ? colors.ocean : colors.line,
                padding: 15,
                borderRadius: 14,
                backgroundColor:
                  selectedYear === item.year ? colors.mist : colors.white,
              },
            ]}
          >
            <Text style={[s.label, { width: 45 }]}>{item.year}</Text>
            <Text style={[s.body, { flex: 1, color: colors.ink }]}>
              {milestoneTitle(item.material, item.year)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.ocean} />
          </Pressable>
        ))}
      </View>
      <Text style={s.sectionTitle}>Fuentes del catálogo</Text>
      <Text style={s.small}>
        Nombres tradicionales contrastados con estas referencias. Las
        reflexiones y propuestas están redactadas para Amor que permanece.
      </Text>
      {catalog.sources.map((source) => (
        <Pressable
          accessibilityRole="link"
          key={source.url}
          onPress={() => {
            if (/^https:\/\//.test(source.url))
              openURL(source.url).catch(() => setError(true));
          }}
        >
          <Text style={s.link}>{source.title} ↗</Text>
        </Pressable>
      ))}
      {error && (
        <Notice text="No pudimos abrir el enlace. Revisa tu conexión e inténtalo de nuevo." />
      )}
    </Screen>
  );
}
