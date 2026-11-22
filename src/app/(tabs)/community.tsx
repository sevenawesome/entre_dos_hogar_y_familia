import { useEffect, useRef, useState } from "react";
import { Text, View, type ScrollViewInstance } from "react-native";
import { router } from "expo-router";
import { loadCommunityPage } from "../../services/community-safety";
import {
  CommunitySafetyActions,
  CommunitySafetyCenter,
} from "../../components/CommunitySafety";
import { useApp } from "../../store";
import type { CommunityProfile } from "../../domain/types";
import { getAnniversary, localDateISO } from "../../domain/anniversary";
import { CommunityCelebrations } from "../../components/CommunityCelebrations";
import { ProfileSharing } from "../../components/ProfileSharing";
import { FamilyPortraits } from "../../components/FamilyPortraits";
import { SectionTabs } from "../../components/SectionTabs";
import { useNow } from "../../components/useNow";
import { PhotoViewer } from "../../components/PhotoViewer";
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
    marriageDate: `2016-${localDateISO("America/La_Paz").slice(5)}`,
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
  const {
      uid,
      demo,
      family,
      communityProfile,
      anniversaryCatalog,
      communityBlocks,
    } = useApp(),
    now = useNow();
  const [section, setSection] = useState<"families" | "celebrate" | "sharing">(
    "families",
  );
  const scroll = useRef<ScrollViewInstance>(null);
  function selectSection(key: typeof section) {
    setSection(key);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
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
      const page = await loadCommunityPage(
        append ? (cursor ?? undefined) : undefined,
      );
      setProfiles((old) =>
        append
          ? [
              ...old,
              ...page.profiles.filter((p) => !old.some((o) => o.uid === p.uid)),
            ]
          : page.profiles,
      );
      setCursor(page.cursor);
      setMore(!!page.cursor);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(() => load()); // Fetch a page without synchronous state changes inside the effect.
  }, [uid, demo, communityProfile]); // eslint-disable-line react-hooks/exhaustive-deps
  const safeProfiles = profiles.filter(
    (p) => !communityBlocks.some((b) => b.uid === p.uid),
  );
  return (
    <Screen scrollRef={scroll}>
      <Heading eyebrow="CRECER ACOMPAÑADOS" title="Nuestra comunidad" />
      <SectionTabs
        selected={section}
        options={[
          {
            id: "families",
            title: "Familias",
            icon: "people-outline",
            description:
              "Conozcan las historias y avances que otras familias eligieron compartir.",
          },
          {
            id: "celebrate",
            title: "Celebrar",
            icon: "gift-outline",
            description:
              "Cumpleaños, aniversarios próximos y felicitaciones que se convierten en recuerdos.",
          },
          {
            id: "sharing",
            title: "Compartir",
            icon: "eye-outline",
            description:
              "Elijan su foto, nombre público y las fechas o avances que desean compartir. Participar es voluntario.",
          },
        ]}
        onSelect={selectSection}
      />
      {demo && (
        <Notice text="Comunidad de ejemplo · familias ficticias. Nada se publica desde la demostración." />
      )}
      {section === "sharing" && family && (
        <>
          <ProfileSharing />
          <FamilyPortraits />
          <CommunitySafetyCenter />
        </>
      )}
      {!!error && <Notice error text={error} />}
      {section === "celebrate" && (
        <CommunityCelebrations profiles={safeProfiles} now={now} />
      )}
      {section === "families" && !busy && !safeProfiles.length && (
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
      {section === "families" &&
        safeProfiles.map((profile) => {
          const anniversary = profile.shareAnniversary
            ? getAnniversary(profile.marriageDate, profile.timezone, now)
            : null;
          const current = anniversaryCatalog.milestones.find(
              (m) => m.year === anniversary?.currentYears,
            ),
            next = anniversaryCatalog.milestones.find(
              (m) =>
                m.year ===
                (anniversary?.isToday
                  ? anniversary.years + 1
                  : anniversary?.years),
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 17,
                  }}
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
                      Próximamente{" "}
                      {anniversary.isToday
                        ? anniversary.years + 1
                        : anniversary.years}{" "}
                      años
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
              {anniversary?.isToday &&
                anniversary.years > 0 &&
                profile.uid !== uid && (
                  <Button
                    tone="love"
                    title="Celebrar con esta familia"
                    onPress={() => selectSection("celebrate")}
                  />
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
              <CommunitySafetyActions
                targetUid={profile.uid}
                label={profile.alias}
                onChanged={() => load()}
              />
            </Card>
          );
        })}
      {section !== "sharing" && (
        <>
          {busy && <Notice text="Cargando familias…" />}
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
        </>
      )}
    </Screen>
  );
}
