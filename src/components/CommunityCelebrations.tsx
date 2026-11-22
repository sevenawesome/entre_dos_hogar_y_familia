import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { getAnniversary } from "../domain/anniversary";
import { upcomingCommunityBirthdays } from "../domain/people";
import type { CommunityProfile } from "../domain/types";
import { useApp } from "../store";
import { AnniversaryGreeting } from "./AnniversaryGreeting";
import { CommunitySafetyActions } from "./CommunitySafety";
import { PhotoViewer } from "./PhotoViewer";
import { Button, Card, Notice, Ring, colors, s } from "./ui";

export function CommunityCelebrations({
  profiles,
  now,
}: {
  profiles: CommunityProfile[];
  now: Date;
}) {
  const { uid, anniversaryCatalog } = useApp();
  const [kind, setKind] = useState<"all" | "anniversaries" | "birthdays">(
    "all",
  );
  const anniversaries = profiles
    .flatMap((profile) => {
      const event = profile.shareAnniversary
        ? getAnniversary(profile.marriageDate, profile.timezone, now)
        : null;
      return event && event.daysRemaining <= 30 ? [{ profile, event }] : [];
    })
    .sort((a, b) => a.event.daysRemaining - b.event.daysRemaining);
  const birthdays = profiles
    .flatMap((profile) =>
      upcomingCommunityBirthdays(
        profile.people ?? [],
        profile.timezone,
        now,
      ).map((person) => ({ profile, person })),
    )
    .sort((a, b) => a.person.daysRemaining - b.person.daysRemaining);
  return (
    <>
      <View style={[s.row, { gap: 7, alignItems: "stretch" }]}>
        {(
          [
            ["all", "Todas", anniversaries.length + birthdays.length],
            ["anniversaries", "Aniversarios", anniversaries.length],
            ["birthdays", "Cumpleaños", birthdays.length],
          ] as const
        ).map(([id, label, count]) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={
              id === "all"
                ? "Mostrar todas las celebraciones"
                : `Mostrar ${label.toLowerCase()}`
            }
            accessibilityState={{ selected: kind === id }}
            onPress={() => setKind(id)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 46,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: kind === id ? colors.ocean : colors.line,
              backgroundColor: kind === id ? colors.sage : colors.white,
              alignItems: "center",
              justifyContent: "center",
              padding: 7,
            }}
          >
            <Text
              style={[
                s.small,
                { textAlign: "center", fontWeight: "700", color: colors.ink },
              ]}
            >
              {label} · {count}
            </Text>
          </Pressable>
        ))}
      </View>
      <Notice text="Próximos 30 días · solo fechas autorizadas de las familias cargadas. Usa «Ver más familias» para ampliar la comunidad consultada." />
      {!anniversaries.length && !birthdays.length && (
        <Card>
          <Text style={s.sectionTitle}>
            Las próximas celebraciones están por llegar
          </Text>
          <Text style={s.body}>
            Todavía no hay fechas compartidas para este período entre las
            familias cargadas. Pueden actualizar o cargar más familias abajo.
          </Text>
        </Card>
      )}
      {kind !== "birthdays" && !!anniversaries.length && (
        <Text accessibilityRole="header" style={s.sectionTitle}>
          Aniversarios próximos
        </Text>
      )}
      {kind !== "birthdays" &&
        anniversaries.map(({ profile, event }) => {
          const current = anniversaryCatalog.milestones.find(
            (item) => item.year === event.currentYears,
          );
          return (
            <Card key={profile.uid} style={{ borderColor: colors.sun }}>
              <View style={s.row}>
                <PhotoViewer
                  uri={profile.avatar}
                  name={profile.alias}
                  size={64}
                />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.sectionTitle}>{profile.alias}</Text>
                  <Text style={s.label}>
                    {event.isToday
                      ? "¡Hoy es su aniversario!"
                      : event.daysRemaining === 1
                        ? "Celebran mañana"
                        : `Celebran en ${event.daysRemaining} días`}
                  </Text>
                </View>
              </View>
              <View style={s.row}>
                <Ring value={event.progress} size={76} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.body}>
                    {event.currentYears} años de casados
                    {current ? ` · Bodas de ${current.material}` : ""}
                  </Text>
                  <Text style={s.small}>
                    Su próximo aniversario:{" "}
                    {event.isToday ? event.years + 1 : event.years} años.
                  </Text>
                </View>
              </View>
              <Button
                secondary
                title="Conocer el significado de sus bodas"
                onPress={() =>
                  router.push({
                    pathname: "/anniversary",
                    params: { year: String(event.currentYears || event.years) },
                  })
                }
              />
              {event.isToday && event.years > 0 && profile.uid !== uid && (
                <AnniversaryGreeting key={event.nextDate} profile={profile} />
              )}
              {event.isToday && profile.uid === uid && (
                <Button
                  tone="love"
                  title="Ver nuestros recuerdos de aniversario"
                  onPress={() => router.push("/anniversary-memories")}
                />
              )}
              <CommunitySafetyActions targetUid={profile.uid} label={profile.alias} />
            </Card>
          );
        })}
      {kind !== "anniversaries" && !!birthdays.length && (
        <Text accessibilityRole="header" style={s.sectionTitle}>
          Cumples en comunidad
        </Text>
      )}
      {kind !== "anniversaries" &&
        birthdays.map(({ profile, person }) => (
          <Card
            key={`${profile.uid}/${person.key}`}
            style={{ backgroundColor: colors.champagne }}
          >
            <View style={s.row}>
              <PhotoViewer uri={person.avatar} name={person.name} size={68} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.sectionTitle}>{person.name}</Text>
                <Text style={s.small}>{profile.alias}</Text>
                <Text style={s.label}>
                  {person.isToday
                    ? "🎂 ¡Hoy cumple años!"
                    : person.daysRemaining === 1
                      ? "🎂 Mañana cumple años"
                      : `🎂 Cumple años en ${person.daysRemaining} días`}
                </Text>
              </View>
            </View>
            <CommunitySafetyActions targetUid={profile.uid} label={profile.alias} />
          </Card>
        ))}
      {kind === "anniversaries" && !anniversaries.length && (
        <Notice text="No hay aniversarios compartidos en los próximos 30 días entre las familias cargadas." />
      )}
      {kind === "birthdays" && !birthdays.length && (
        <Notice text="No hay cumpleaños compartidos en los próximos 30 días entre las familias cargadas." />
      )}
      <Text style={s.small}>
        Los cumpleaños públicos muestran el día y mes, sin edad ni año de
        nacimiento. Cada familia elige qué compartir.
      </Text>
    </>
  );
}
