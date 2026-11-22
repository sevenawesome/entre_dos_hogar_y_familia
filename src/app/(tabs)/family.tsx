import { useEffect, useState } from "react";
import { Text, View, Switch, Pressable, Linking, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { displayMarriageDate } from "../../domain/anniversary";
import { Brand } from "../../components/Brand";
import { LogoutControl } from "../../components/LogoutControl";
import { SectionTabs } from "../../components/SectionTabs";
import { PhotoViewer } from "../../components/PhotoViewer";
import { CreatorFooter } from "../../components/CreatorFooter";
import { BirthdaysCard } from "../../components/BirthdaysCard";
import { useNow } from "../../components/useNow";
import { signOut } from "firebase/auth";
import { useApp, store, actions } from "../../store";
import { FamilyForm } from "../../components/FamilyForm";
import { ProfileSharing } from "../../components/ProfileSharing";
import { FamilyPortraits } from "../../components/FamilyPortraits";
import { EmailVerificationCard } from "../../components/EmailVerificationCard";
import { AccountSecurityCard } from "../../components/AccountSecurityCard";
import { PermanentDeletionCard } from "../../components/PermanentDeletionCard";
import { auth } from "../../services/firebase";
import {
  disableDevice,
  loadPreferences,
  registerDevice,
} from "../../services/notifications";
import { callBackend, friendlyError } from "../../services/api";
import type { DevicePreferences } from "../../domain/types";
import {
  Screen,
  Heading,
  Card,
  Button,
  Field,
  Notice,
  s,
  colors,
} from "../../components/ui";
export default function FamilyScreen() {
  const {
    family,
    demo,
    uid,
    settings,
    controls,
    communityProfile,
    portraits,
    avatar,
  } = useApp();
  const now = useNow();
  const [selectedSection, setSection] = useState<
    "family" | "reminders" | "account"
  >("family");
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [editingManually, setEditing] = useState(false),
    [preferences, setPreferences] = useState<DevicePreferences>({
      enabled: false,
      hour: 20,
      minute: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    [time, setTime] = useState("20:00"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [deleting, setDeleting] = useState(false),
    [confirmation, setConfirmation] = useState("");
  const editing =
    editingManually || edit === "marriage" || edit === "birthdays";
  const section = editing ? "family" : selectedSection;
  useEffect(() => {
    loadPreferences()
      .then((p) => {
        setPreferences(p);
        setTime(
          `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
        );
      })
      .catch(() => {});
  }, [uid]);
  async function saveReminder() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError("Usa un horario válido, por ejemplo 20:00.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const [hour, minute] = time.split(":").map(Number);
      await registerDevice({ ...preferences, hour, minute }, true);
      setMessage(
        preferences.enabled
          ? "Listo. Recordaremos tus retos, aniversario y cumpleaños familiares en este horario."
          : "Pausamos los recordatorios en este teléfono.",
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeAccount() {
    setBusy(true);
    setError("");
    try {
      await callBackend("deleteFamilyAccount", {});
      await disableDevice().catch(() => {});
      if (auth) await signOut(auth);
      store.dispatch(actions.session({ uid: null }));
      router.replace("/welcome");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <View
        style={[
          s.row,
          { justifyContent: "space-between", alignItems: "flex-start" },
        ]}
      >
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={s.eyebrow}>NUESTRO ESPACIO</Text>
          <Text accessibilityRole="header" style={s.title}>
            Nosotros
          </Text>
        </View>
        <LogoutControl disabled={busy || editing} />
      </View>
      {!editing && (
        <SectionTabs
          selected={section}
          disabled={busy}
          options={[
            {
              id: "family",
              title: "Familia",
              icon: "people-outline",
              description:
                "Sus fotos, integrantes, cumpleaños y aniversario, en un mismo lugar.",
            },
            {
              id: "reminders",
              title: "Avisos",
              icon: "notifications-outline",
              description:
                "Elijan cómo y a qué hora recibir avisos en este teléfono.",
            },
            {
              id: "account",
              title: "Cuenta",
              icon: "shield-checkmark-outline",
              description:
                "Su correo, contraseña, privacidad y gestión de la cuenta compartida.",
            },
          ]}
          onSelect={(key) => {
            setSection(key);
            setError("");
            setMessage("");
          }}
        />
      )}
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
      {demo && (
        <Notice text="Vista de ejemplo: la información de esta familia es ficticia." />
      )}
      {section === "family" && (
        <>
          {editing ? (
            <Card>
              <Heading
                title="Su familia"
                subtitle="Actualicen sus datos y las fechas de quienes aman."
              />
              <FamilyForm
                initial={family}
                onSaved={() => {
                  setEditing(false);
                  setSection("family");
                  router.setParams({ edit: undefined });
                  setMessage("Guardamos los cambios de su familia.");
                }}
              />
              <Button
                secondary
                title="Cancelar edición"
                onPress={() => {
                  setEditing(false);
                  setSection("family");
                  router.setParams({ edit: undefined });
                }}
              />
            </Card>
          ) : (
            <>
              <Card>
                <View style={s.row}>
                  <PhotoViewer
                    uri={avatar}
                    name={family?.name ?? "Su familia"}
                    size={82}
                  />
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={s.sectionTitle}>{family?.name}</Text>
                    <Text style={s.body}>
                      {family?.partner1} y {family?.partner2}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    s.row,
                    {
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: colors.champagne,
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={colors.gold}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.label}>Nuestro matrimonio</Text>
                    <Text style={s.body}>
                      {displayMarriageDate(family?.marriageDate)}
                    </Text>
                  </View>
                </View>
                {!!family?.children.length && (
                  <View style={{ gap: 5 }}>
                    <Text style={s.label}>También forman nuestra familia</Text>
                    <Text style={s.body}>
                      {family.children.map((c) => c.name).join(", ")}
                    </Text>
                  </View>
                )}
                <Button
                  title="Editar datos y fechas familiares"
                  secondary
                  icon="create-outline"
                  onPress={() => setEditing(true)}
                />
                <Button
                  title="Ver nuestro aniversario"
                  secondary
                  icon="heart-outline"
                  onPress={() => router.push("/anniversary")}
                />
              </Card>
              {family && (
                <>
                  <BirthdaysCard
                    family={family}
                    now={now}
                    portraits={portraits}
                  />
                  <FamilyPortraits />
                  <ProfileSharing key={`${uid}-${!!communityProfile}`} />
                </>
              )}
            </>
          )}
        </>
      )}
      {!editing && section === "reminders" && (
        <>
          {(!settings.notificationsEnabled || controls.remindersPaused) && (
            <Notice text="La administración ha pausado los avisos. Tu horario se conserva y puedes seguir haciendo retos." />
          )}
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View style={[s.row, { flex: 1 }]}>
                <Ionicons
                  name="notifications-outline"
                  size={23}
                  color={colors.navy}
                />
                <Text style={[s.sectionTitle, { fontSize: 21, flex: 1 }]}>
                  Retos y fechas especiales
                </Text>
              </View>
              <Switch
                accessibilityLabel="Activar recordatorios en este teléfono"
                value={preferences.enabled}
                onValueChange={(enabled) => {
                  setPreferences({ ...preferences, enabled });
                  setMessage("");
                }}
                trackColor={{ false: "#D2D5CB", true: colors.navy }}
              />
            </View>
            <Text style={s.body}>
              Este horario es para tu teléfono. Tu pareja puede elegir el suyo
              desde su dispositivo.
            </Text>
            <Field
              label="Recordarme a las · formato 24 horas"
              value={time}
              onChangeText={setTime}
              placeholder="20:00"
              maxLength={5}
              keyboardType={
                Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
              }
            />
            <Text style={s.small}>
              {preferences.timezone} · El teléfono presenta los avisos según sus
              permisos y ajustes.
            </Text>
            <Text style={s.small}>
              Si queda un reto pendiente, volveremos a recordarlo al día
              siguiente. Al terminar los niveles, se detienen los avisos de
              retos. El saludo de aniversario y los cumpleaños continúan cada
              año mientras mantengas activos los recordatorios.
            </Text>
            <Button
              secondary
              title="Guardar recordatorio"
              onPress={saveReminder}
              busy={busy}
            />
            {Platform.OS !== "web" && (
              <Pressable onPress={() => Linking.openSettings()}>
                <Text style={s.link}>Abrir permisos del teléfono</Text>
              </Pressable>
            )}
          </Card>
        </>
      )}
      {!editing && section === "account" && (
        <>
          <EmailVerificationCard />
          <AccountSecurityCard key={uid} />
          <PermanentDeletionCard />
          <Card>
            <Text style={s.sectionTitle}>Conectar a mi pareja</Text>
            <Text style={s.body}>
              Instalen Amor que permanece en ambos teléfonos e inicien sesión
              con el mismo correo y contraseña. Comparten la familia, los retos
              y sus recuerdos.
            </Text>
            <Notice text="Sus notas y respuestas son compartidas: ambos podrán leerlas desde la cuenta familiar." />
          </Card>
          <Card>
            <Text style={s.sectionTitle}>Privacidad y datos</Text>
            <Text style={s.body}>
              Conozcan qué guardamos, qué comparten entre los dos y cómo se
              cuida su información.
            </Text>
            <Button
              secondary
              title="Ver privacidad y cuidado de sus datos"
              icon="document-text-outline"
              onPress={() => router.push("/privacy")}
            />
          </Card>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.loveLine,
              paddingTop: 20,
              gap: 8,
            }}
          >
            <Text style={[s.label, { color: colors.love }]}>
              GESTIÓN DE LA CUENTA FAMILIAR
            </Text>
            <Text style={s.small}>
              Estas opciones afectan a los dos integrantes. Para salir solo de
              este teléfono, usa «Cerrar sesión» arriba.
            </Text>
            {!demo && (
              <View style={{ gap: 14 }}>
                {deleting ? (
                  <Card>
                    <Text style={s.label}>
                      Desactivar nuestra cuenta familiar
                    </Text>
                    <Text style={s.body}>
                      Se bloqueará el acceso de ambos y la familia dejará de
                      aparecer. Sus fotos, progreso y recuerdos se conservarán
                      en privado. El propietario podrá restablecer la cuenta
                      desde Administración.
                    </Text>
                    <Field
                      label="Escribe DESACTIVAR para confirmar"
                      value={confirmation}
                      onChangeText={setConfirmation}
                      autoCapitalize="characters"
                    />
                    <Button
                      title="Desactivar cuenta"
                      disabled={confirmation !== "DESACTIVAR"}
                      busy={busy}
                      onPress={removeAccount}
                    />
                    <Button
                      secondary
                      title="Conservar nuestra cuenta"
                      onPress={() => {
                        setDeleting(false);
                        setConfirmation("");
                      }}
                    />
                  </Card>
                ) : (
                  <Pressable onPress={() => setDeleting(true)}>
                    <Text
                      style={[
                        s.small,
                        {
                          color: colors.navy,
                          textAlign: "center",
                          padding: 14,
                        },
                      ]}
                    >
                      Desactivar cuenta familiar
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </>
      )}
      <View style={{ alignItems: "center", marginTop: 10 }}>
        <Brand compact />
      </View>
      <Text style={[s.small, { textAlign: "center" }]}>
        Amor que permanece · Versión 1.0.0{"\n"}Hecho para los pequeños
        momentos.
      </Text>
      <CreatorFooter />
    </Screen>
  );
}
