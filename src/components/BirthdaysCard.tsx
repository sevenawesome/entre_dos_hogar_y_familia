import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Family, FamilyPortraits } from "../domain/types";
import { PhotoViewer } from "./PhotoViewer";
import { getFamilyBirthdays } from "../domain/birthdays";
import { Card, s } from "./ui";
export function BirthdaysCard({
  family,
  now,
  portraits = {},
}: {
  family: Family;
  now: Date;
  portraits?: FamilyPortraits;
}) {
  const birthdays = getFamilyBirthdays(family, now);
  return (
    <Card style={{ backgroundColor: "#F1F9F5", borderColor: "#CFE7DB" }}>
      <View style={s.row}>
        <View
          style={{
            width: 40,
            height: 40,
            backgroundColor: "#D9EFE4",
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="gift-outline" color="#32735D" size={22} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[s.sectionTitle, { fontSize: 22 }]}>
            Cumples en familia
          </Text>
          <Text style={s.small}>Un detalle para recordar a quienes aman.</Text>
        </View>
      </View>
      {!birthdays.length && (
        <Text style={s.body}>
          Agreguen los cumpleaños de la pareja y sus hijos para ver las edades y
          la cuenta regresiva.
        </Text>
      )}
      {birthdays.map((birthday) => (
        <View
          key={birthday.id}
          style={{
            gap: 8,
            paddingTop: 11,
            borderTopWidth: 1,
            borderTopColor: "#D9E8E0",
          }}
        >
          <View
            style={[
              s.row,
              { justifyContent: "space-between", alignItems: "flex-start" },
            ]}
          >
            <PhotoViewer
              uri={portraits[birthday.id]?.dataUri}
              name={birthday.name}
              size={56}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.label}>{birthday.name}</Text>
              <Text style={s.small}>
                {birthday.isToday
                  ? birthday.nextAge === 0
                    ? "¡Hoy empieza su historia!"
                    : `¡Hoy cumple ${birthday.nextAge} ${birthday.nextAge === 1 ? "año" : "años"}!`
                  : `${birthday.currentAge} ${birthday.currentAge === 1 ? "año" : "años"} · Próximamente ${birthday.nextAge}`}
              </Text>
            </View>
            <Text
              style={{
                color: "#286B52",
                fontSize: 12,
                fontWeight: "700",
                backgroundColor: "#D9EFE4",
                borderRadius: 8,
                paddingHorizontal: 9,
                paddingVertical: 5,
              }}
            >
              {birthday.isToday
                ? "¡Es hoy!"
                : birthday.daysRemaining === 1
                  ? "Mañana"
                  : `${birthday.daysRemaining} días`}
            </Text>
          </View>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Cumpleaños de ${birthday.name}, ${birthday.daysRemaining} días restantes`}
            accessibilityValue={{ min: 0, max: 100, now: birthday.progress }}
            style={{
              backgroundColor: "#DCEAE2",
              height: 7,
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${birthday.progress}%`,
                height: 7,
                borderRadius: 5,
                backgroundColor:
                  birthday.daysRemaining <= 30 ? "#DD9940" : "#4A9677",
              }}
            />
          </View>
          <Text style={[s.small, { fontSize: 10 }]}>
            {new Intl.DateTimeFormat("es", {
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            }).format(new Date(`${birthday.nextDate}T12:00:00Z`))}
          </Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: "/(tabs)/family",
            params: { edit: "birthdays" },
          })
        }
        style={[s.row, { minHeight: 40 }]}
      >
        <Text style={[s.link, { color: "#32735D", flex: 1 }]}>
          {birthdays.length
            ? "Editar cumpleaños familiares"
            : "Agregar cumpleaños"}
        </Text>
        <Ionicons name="arrow-forward" color="#32735D" size={17} />
      </Pressable>
    </Card>
  );
}
