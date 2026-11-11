import { useEffect, useState } from "react";
import { Text, View, Switch, Pressable, Linking, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { displayMarriageDate } from "../../domain/anniversary";
import { Brand } from "../../components/Brand";
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
  const { family, demo, uid, settings, controls, communityProfile, portraits } =
    useApp();
  const now = useNow();
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
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await disableDevice();
      if (!demo && auth) await signOut(auth);
      store.dispatch(actions.session({ uid: null }));
      router.replace("/welcome");
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
      <Heading
        eyebrow="UN EQUIPO, UNA HISTORIA"
        title="Nosotros"
        subtitle="Su familia y los pequeños hábitos que quieren cuidar."
      />
      {demo && (
        <Notice text="Están explorando una demostración local. Para compartir el progreso, usen una cuenta con Firebase configurado." />
      )}
      {(!settings.notificationsEnabled || controls.remindersPaused) && (
        <Notice text="La administración ha pausado los avisos. Tu horario se conserva y podrás seguir haciendo retos." />
      )}
      {!editing && <EmailVerificationCard />}
      {!editing && <AccountSecurityCard key={uid} />}
      {!editing && family && (
        <ProfileSharing key={`${uid}-${!!communityProfile}`} />
      )}
      {editing ? (
        <Card>
          <FamilyForm
            initial={family}
            onSaved={() => {
              setEditing(false);
              router.setParams({ edit: undefined });
              setMessage("Guardamos los cambios de su familia.");
            }}
          />
          <Button
            secondary
            title="Cancelar"
            onPress={() => {
              setEditing(false);
              router.setParams({ edit: undefined });
            }}
          />
        </Card>
      ) : (
        <Card>
          <View style={s.row}>
            <View
              style={{
                width: 56,
                height: 56,
                backgroundColor: colors.champagne,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="people-outline" size={27} color={colors.navy} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
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
                backgroundColor: colors.mist,
                padding: 14,
                borderRadius: 14,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={23} color={colors.ocean} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.label}>Nuestro matrimonio</Text>
              <Text style={s.small}>
                {displayMarriageDate(family?.marriageDate) ||
                  "Agreguen su fecha para contar los días hasta su aniversario."}
              </Text>
            </View>
          </View>
          {!!family?.children.length && (
            <View style={{ gap: 6 }}>
              <Text style={s.label}>Nuestra familia también la forman</Text>
              <Text style={s.body}>
                {family.children.map((c) => c.name).join(", ")}
              </Text>
            </View>
          )}
          <Button
            title="Editar nuestra familia"
            secondary
            onPress={() => setEditing(true)}
          />
        </Card>
      )}
      {!editing && family && <FamilyPortraits />}
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
          Este horario es para tu teléfono. Tu pareja puede elegir el suyo desde
          su dispositivo.
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
          Si queda un reto pendiente, volveremos a recordarlo al día siguiente.
          Al terminar los niveles, se detienen los avisos de retos. El saludo de
          aniversario y los cumpleaños continúan cada año mientras mantengas
          activos los recordatorios.
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
      <Card>
        <Text style={s.sectionTitle}>Conectar a mi pareja</Text>
        <Text style={s.body}>
          Instalen Amor que permanece en ambos teléfonos e inicien sesión con el
          mismo correo y contraseña. Comparten la familia, los retos y sus
          recuerdos.
        </Text>
        <Notice text="Sus notas y respuestas son compartidas: ambos podrán leerlas desde la cuenta familiar." />
      </Card>
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
      <Pressable onPress={() => router.push("/privacy")}>
        <Text style={s.link}>Privacidad y cuidado de sus datos</Text>
      </Pressable>
      <Button
        secondary
        title={
          demo ? "Salir de la demostración" : "Cerrar sesión en este teléfono"
        }
        onPress={logout}
        busy={busy}
      />
      {!demo && (
        <View style={{ gap: 14 }}>
          {deleting ? (
            <Card>
              <Text style={s.label}>Desactivar nuestra cuenta familiar</Text>
              <Text style={s.body}>
                Se bloqueará el acceso de ambos y la familia dejará de aparecer.
                Sus fotos, progreso y recuerdos se conservarán en privado. El
                propietario podrá restablecer la cuenta desde Administración.
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
                  { color: colors.navy, textAlign: "center", padding: 14 },
                ]}
              >
                Desactivar cuenta familiar
              </Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={{ alignItems: "center", marginTop: 10 }}>
        <Brand compact />
      </View>
      {family && !editing && (
        <BirthdaysCard family={family} now={now} portraits={portraits} />
      )}
      <Text style={[s.small, { textAlign: "center" }]}>
        Amor que permanece · Versión 1.0.0{"\n"}Hecho para los pequeños
        momentos.
      </Text>
      <CreatorFooter />
    </Screen>
  );
}
