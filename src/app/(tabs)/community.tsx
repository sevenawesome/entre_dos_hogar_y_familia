import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { router } from "expo-router";
import { db } from "../../services/firebase";
import { useApp } from "../../store";
import type { CommunityProfile } from "../../domain/types";
import { getAnniversary } from "../../domain/anniversary";
import { useNow } from "../../components/useNow";
import { PhotoViewer } from "../../components/PhotoViewer";
import { upcomingCommunityBirthdays } from "../../domain/people";
import {
  Screen,
  Heading,
  Card,
  Button,
  Notice,
  Ring,
  colors,
  s,
} from "../../components/ui";
import { friendlyError } from "../../services/api";
const demoProfiles: CommunityProfile[] = [
  {
    uid: "example-a",
    alias: "Familia Rivera",
    visible: true,
    shareAnniversary: true,
    shareProgress: true,
    marriageDate: "2016-11-08",
    timezone: "America/La_Paz",
    completedCount: 18,
    finishedCount: 0,
    avatar: null,
  },
  {
    uid: "example-b",
    alias: "Elena y Marcos",
    visible: true,
    shareAnniversary: true,
    shareProgress: true,
    marriageDate: "2001-11-20",
    timezone: "America/La_Paz",
    completedCount: 30,
    finishedCount: 1,
    avatar: null,
  },
  {
    uid: "example-c",
    alias: "Equipo Jiménez",
    visible: true,
    shareAnniversary: false,
    shareProgress: true,
    marriageDate: null,
    timezone: "America/La_Paz",
    completedCount: 7,
    finishedCount: 0,
    avatar: null,
  },
];
export default function Community() {
  const { uid, demo, communityProfile, anniversaryCatalog } = useApp(),
    now = useNow();
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]),
    [cursor, setCursor] = useState<QueryDocumentSnapshot>(),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load(append = false) {
    if (demo) {
      setProfiles([
        ...(communityProfile?.visible ? [communityProfile] : []),
        ...demoProfiles,
      ]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const page = await getDocs(
        query(
          collection(db!, "community"),
          where("visible", "==", true),
          ...(append && cursor ? [startAfter(cursor)] : []),
          limit(8),
        ),
      );
      setProfiles((old) =>
        append
          ? [...old, ...page.docs.map((d) => d.data() as CommunityProfile)]
          : page.docs.map((d) => d.data() as CommunityProfile),
      );
      setCursor(page.docs.at(-1));
      setMore(page.size === 8);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(() => load()); // Fetch a page without synchronous state changes inside the effect.
  }, [uid, demo, communityProfile]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen>
      <Heading
        eyebrow="CRECER ACOMPAÑADOS"
        title="Nuestra comunidad"
        subtitle="Cada familia tiene su ritmo. Aquí celebramos los pequeños pasos y las historias que siguen creciendo."
      />
      {demo && (
        <Notice text="Comunidad de ejemplo · familias ficticias. Nada se publica desde la demostración." />
      )}
      <Button
        secondary
        title="Elegir qué compartimos"
        onPress={() => router.push("/(tabs)/family")}
      />
      {!!error && <Notice error text={error} />}
      {!busy && !profiles.length && (
        <Card>
          <Text style={s.sectionTitle}>
            Las primeras historias están por llegar
          </Text>
          <Text style={s.body}>
            La participación es voluntaria. Su familia puede ser una de las
            primeras en compartir su aniversario.
          </Text>
        </Card>
      )}
      {profiles.map((profile) => {
        const anniversary = profile.shareAnniversary
          ? getAnniversary(profile.marriageDate, profile.timezone, now)
          : null;
        const current = anniversaryCatalog.milestones.find(
            (m) => m.year === anniversary?.currentYears,
          ),
          next = anniversaryCatalog.milestones.find(
            (m) => m.year === anniversary?.years,
          );
        return (
          <Card
            key={profile.uid}
            style={{
              borderColor:
                anniversary && anniversary.daysRemaining <= 30
                  ? "#D5B279"
                  : colors.line,
            }}
          >
            <View
              style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
            >
              <PhotoViewer
                uri={profile.avatar}
                name={profile.alias}
                size={72}
              />
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.sectionTitle}>{profile.alias}</Text>
                <Text style={s.small}>
                  {profile.uid === uid
                    ? "Su familia · lo que están compartiendo"
                    : "Una historia de nuestra comunidad"}
                </Text>
                {!!profile.avatar && (
                  <Text style={s.small}>Toca la foto para ampliarla</Text>
                )}
              </View>
            </View>
            {anniversary ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 17 }}
              >
                <Ring value={anniversary.progress} size={88} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.label}>
                    {anniversary.isToday
                      ? "¡Hoy celebran su aniversario!"
                      : `${anniversary.daysRemaining} días para celebrar`}
                  </Text>
                  <Text style={s.body}>
                    {anniversary.currentYears} años de casados
                    {current ? ` · Bodas de ${current.material}` : ""}
                  </Text>
                  <Text style={s.small}>
                    Próximamente {anniversary.years} años
                    {next ? ` · Bodas de ${next.material}` : ""}
                  </Text>
                  <Button
                    secondary
                    title="Significado de sus bodas"
                    onPress={() =>
                      router.push({
                        pathname: "/anniversary",
                        params: {
                          year: String(
                            anniversary.currentYears || anniversary.years,
                          ),
                        },
                      })
                    }
                  />
                </View>
              </View>
            ) : (
              <Text style={s.small}>
                Su aniversario queda en su espacio privado.
              </Text>
            )}
            {profile.shareProgress && (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.sage,
                }}
              >
                <Text style={s.label}>
                  ♡ {profile.completedCount} momentos compartidos ·{" "}
                  {profile.finishedCount} niveles conseguidos
                </Text>
              </View>
            )}
            {upcomingCommunityBirthdays(
              profile.people ?? [],
              profile.timezone,
              now,
            ).map((person) => (
              <View
                key={person.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: colors.champagne,
                  padding: 14,
                  borderRadius: 16,
                }}
              >
                <PhotoViewer uri={person.avatar} name={person.name} size={64} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.label}>{person.name}</Text>
                  <Text style={s.body}>
                    {person.isToday
                      ? "🎂 ¡Hoy cumple años!"
                      : person.daysRemaining === 1
                        ? "🎂 Mañana cumple años"
                        : `🎂 Cumple años en ${person.daysRemaining} días`}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        );
      })}
      {more && (
        <Button
          secondary
          title="Ver más familias"
          busy={busy}
          onPress={() => load(true)}
        />
      )}
      <Button
        secondary
        title="Actualizar comunidad"
        busy={busy}
        onPress={() => load()}
      />
      <Text style={s.small}>
        Solo se muestran perfiles que eligieron participar. Los datos se
        actualizan cuando cada familia sincroniza la app.
      </Text>
    </Screen>
  );
}
