import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getAnniversary } from "../domain/anniversary";
import type { Family } from "../domain/types";
import { Button, colors, s, serif } from "./ui";
import { useApp } from "../store";
import { milestoneFor, milestoneTitle } from "../data/anniversaries";
export function AnniversaryCard({
  family,
  now,
}: {
  family: Family;
  now: Date;
}) {
  const { anniversaryCatalog } = useApp();
  const anniversary = getAnniversary(family.marriageDate, family.timezone, now);
  if (!anniversary)
    return (
      <View
        style={{
          backgroundColor: colors.lavender,
          borderRadius: 24,
          padding: 22,
          gap: 14,
        }}
      >
        <View style={s.row}>
          <Ionicons
            name="heart-circle-outline"
            color={colors.violet}
            size={30}
          />
          <Text style={[s.sectionTitle, { flex: 1 }]}>
            Una fecha que es solo suya
          </Text>
        </View>
        <Text style={s.body}>
          Guarden su fecha de matrimonio y vean cuánto falta para celebrar otro
          año juntos.
        </Text>
        <Button
          secondary
          title="Agregar nuestra fecha"
          onPress={() =>
            router.push({
              pathname: "/(tabs)/family",
              params: { edit: "marriage" },
            })
          }
        />
      </View>
    );
  const { daysRemaining, isToday, years, progress, nextDate } = anniversary;
  const stages = [
    { label: "AHORA · AÑOS CUMPLIDOS", year: anniversary.currentYears },
    { label: "SU PRÓXIMO ANIVERSARIO", year: isToday ? years + 1 : years },
  ];
  const circumference = 2 * Math.PI * 54;
  const label = isToday
    ? "Hoy es su aniversario"
    : `Faltan ${daysRemaining} días para su aniversario`;
  const dateLabel = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${nextDate}T12:00:00Z`));
  return (
    <LinearGradient
      colors={isToday ? ["#C52F67", "#813CAA"] : ["#753EB0", "#AC3C83"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 27, padding: 23, gap: 17, overflow: "hidden" }}
    >
      <View
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: 110,
          right: -80,
          bottom: -115,
          borderColor: "#FFFFFF20",
          borderWidth: 25,
        }}
      />
      <View style={[s.row, { justifyContent: "space-between", gap: 7 }]}>
        <Text style={[s.eyebrow, { color: "#FFE5AE", letterSpacing: 1.6 }]}>
          SU FECHA ESPECIAL
        </Text>
        <View
          style={{
            backgroundColor: "#FFFFFF24",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
            {isToday
              ? "¡ES HOY!"
              : daysRemaining <= 30
                ? "¡YA CASI!"
                : "UN AÑO MÁS DE AMOR"}
          </Text>
        </View>
      </View>
      <Text style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 22 }}>
        Llevan{" "}
        <Text style={{ fontWeight: "700" }}>
          {anniversary.currentYears}{" "}
          {anniversary.currentYears === 1 ? "año" : "años"}
        </Text>{" "}
        de casados.
      </Text>
      <View style={[s.row, { gap: 18, flexWrap: "wrap" }]}>
        <View style={{ flex: 1, minWidth: 125, gap: 9 }}>
          <Text
            style={{
              fontFamily: serif,
              fontSize: 29,
              lineHeight: 34,
              color: "#FFFFFF",
            }}
          >
            {isToday ? "Feliz aniversario." : "Cada vez más cerca."}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 21, color: "#F9DFF2" }}>
            {isToday
              ? `Hoy celebran ${years} ${years === 1 ? "año" : "años"} eligiéndose.`
              : `El ${dateLabel} celebran ${years} ${years === 1 ? "año" : "años"} de matrimonio.`}
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel={label}
          style={{
            width: 130,
            height: 130,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={130} height={130} style={{ position: "absolute" }}>
            <Defs>
              <SvgGradient id="anniversary-gold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFF2B6" />
                <Stop offset="1" stopColor="#FFB677" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={65}
              cy={65}
              r={54}
              fill="#FFFFFF0D"
              stroke="#FFFFFF28"
              strokeWidth={8}
            />
            <Circle
              cx={65}
              cy={65}
              r={54}
              fill="none"
              stroke="url(#anniversary-gold)"
              strokeWidth={8}
              strokeDasharray={`${circumference}`}
              strokeDashoffset={circumference * (1 - progress / 100)}
              strokeLinecap="round"
              transform="rotate(-90 65 65)"
            />
          </Svg>
          <Ionicons name="heart" color="#FFE4AA" size={15} />
          <Text
            style={{
              fontSize: isToday ? 32 : 38,
              lineHeight: 45,
              color: "#FFFFFF",
              fontWeight: "600",
            }}
          >
            {isToday ? "Hoy" : daysRemaining}
          </Text>
          <Text
            style={{
              color: "#F9DFF2",
              fontSize: 8.5,
              lineHeight: 11,
              textAlign: "center",
            }}
          >
            {isToday
              ? "A CELEBRAR"
              : daysRemaining === 1
                ? "DÍA PARA\nCELEBRAR"
                : "DÍAS PARA\nCELEBRAR"}
          </Text>
        </View>
      </View>
      <View style={{ gap: 9 }}>
        {stages.map((stage) => {
          const milestone = milestoneFor(anniversaryCatalog, stage.year);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${stage.year} años. ${milestoneTitle(milestone.material, stage.year)}. Ver significado`}
              key={stage.label}
              onPress={() =>
                router.push({
                  pathname: "/anniversary",
                  params: { year: String(stage.year) },
                })
              }
              style={{
                backgroundColor: "#FFFFFF18",
                borderRadius: 14,
                padding: 13,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 64,
              }}
            >
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  style={{
                    color: "#F4D4EF",
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                  }}
                >
                  {stage.label}
                </Text>
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}
                >
                  {stage.year === 0
                    ? "Recién casados"
                    : `${stage.year} ${stage.year === 1 ? "año" : "años"}`}{" "}
                  · {milestoneTitle(milestone.material, stage.year)}
                </Text>
                <Text style={{ color: "#FFE4AA", fontSize: 10 }}>
                  Tocar para conocer su significado
                </Text>
              </View>
              <Ionicons name="chevron-forward" color="#FFE4AA" size={19} />
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/anniversary")}
          style={{ paddingVertical: 9 }}
        >
          <Text style={{ color: "#FFE4AA", fontSize: 12, fontWeight: "600" }}>
            Ver todas las categorías de bodas →
          </Text>
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: "#FFFFFF25",
          paddingTop: 13,
        }}
      >
        <Ionicons
          name={isToday ? "sparkles-outline" : "calendar-outline"}
          size={17}
          color="#FFE4AA"
        />
        <Text
          style={{ color: "#F9DFF2", fontSize: 11, flex: 1, lineHeight: 18 }}
        >
          {isToday
            ? "Regálense un momento y celebren su historia."
            : "Una vuelta más al sol. Una historia que sigue creciendo."}
        </Text>
      </View>
    </LinearGradient>
  );
}
