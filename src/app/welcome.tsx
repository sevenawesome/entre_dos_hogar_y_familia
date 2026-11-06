import { useState } from "react";
import { Text, View, Pressable, Image } from "react-native";
import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, firebaseConfigured } from "../services/firebase";
import { startDemo, store, actions } from "../store";
import { requestEmailVerification } from "../services/email";
import { requestPasswordRecovery } from "../services/account-security";
import { friendlyError } from "../services/api";
import { Brand } from "../components/Brand";
import { CreatorFooter } from "../components/CreatorFooter";
import {
  Screen,
  Field,
  Button,
  Notice,
  colors,
  s,
  serif,
} from "../components/ui";
export default function Welcome() {
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [info, setInfo] = useState("");
  async function submit() {
    setError("");
    setInfo("");
    if (!email.trim() || password.length < 8) {
      setError("Escribe un correo y una contraseña de al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const credential = await createUserWithEmailAndPassword(
          auth!,
          email.trim(),
          password,
        );
        try {
          await requestEmailVerification(credential.user);
        } catch (e) {
          store.dispatch(
            actions.verificationMessage(
              `La cuenta se creó. Puedes volver a solicitar la verificación desde Hoy o Nosotros. ${friendlyError(e)}`,
            ),
          );
        }
      } else await signInWithEmailAndPassword(auth!, email.trim(), password);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!email.trim()) {
      setError("Escribe tu correo para recuperar el acceso.");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await requestPasswordRecovery(email);
      setInfo(
        "Si el correo está registrado, recibirás un enlace para recuperar el acceso.",
      );
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <View
        style={{
          borderRadius: 28,
          overflow: "hidden",
          height: 505,
          backgroundColor: colors.cream,
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <Image
          source={require("../../assets/brand/splash-art.jpg")}
          resizeMode="cover"
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
        <View
          style={{
            paddingHorizontal: 22,
            paddingTop: 34,
            alignItems: "center",
            gap: 12,
          }}
        >
          <Brand />
          <Text
            style={{
              fontFamily: serif,
              fontSize: 23,
              lineHeight: 28,
              textAlign: "center",
              color: colors.ink,
            }}
          >
            Un día a la vez.{"\n"}Una vida juntos.
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "center", gap: 10, marginTop: 4 }}>
        <Text style={s.eyebrow}>SU AMOR MERECE ESTE MOMENTO</Text>
        <Text style={[s.body, { textAlign: "center" }]}>
          Pequeños retos para volver a encontrarse, escucharse y crecer juntos.
        </Text>
      </View>
      <View style={{ gap: 15, marginTop: 10 }}>
        <View style={s.row}>
          {[false, true].map((value) => (
            <Pressable
              key={String(value)}
              accessibilityRole="button"
              onPress={() => {
                setSignup(value);
                setError("");
              }}
              style={{
                flex: 1,
                borderBottomWidth: 2,
                borderBottomColor: signup === value ? colors.navy : colors.line,
                paddingBottom: 12,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "600",
                  color: signup === value ? colors.navy : colors.muted,
                }}
              >
                {value ? "Crear cuenta" : "Iniciar sesión"}
              </Text>
            </Pressable>
          ))}
        </View>
        {!firebaseConfigured && (
          <Notice text="Prueba la experiencia en este teléfono. El acceso compartido estará disponible al conectar Firebase." />
        )}
        <Field
          label="Correo de la pareja"
          value={email}
          onChangeText={setEmail}
          placeholder="su.correo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Al menos 8 caracteres"
          secureTextEntry
          autoComplete={signup ? "new-password" : "current-password"}
        />
        {signup && (
          <Text style={s.small}>
            Recibirán un enlace de verificación, una bienvenida tras verificar
            su correo y una felicitación al conseguir cada nivel. El equipo
            podrá enviar avisos sobre su cuenta y el programa.
          </Text>
        )}
        {!!error && <Notice text={error} error />}
        {!!info && <Notice text={info} />}
        <Button
          title={signup ? "Empezar nuestro camino" : "Entrar a nuestro espacio"}
          busy={busy}
          disabled={!firebaseConfigured}
          onPress={submit}
        />
        {!signup && firebaseConfigured && (
          <Pressable accessibilityRole="button" disabled={busy} onPress={reset}>
            <Text style={[s.link, { textAlign: "center" }]}>
              Olvidé la contraseña
            </Text>
          </Pressable>
        )}
        <Button
          secondary
          title="Explorar demostración"
          onPress={() => {
            startDemo().catch((e) => setError(friendlyError(e)));
          }}
        />
        <Text style={[s.small, { textAlign: "center" }]}>
          Una cuenta para los dos. Inicien sesión con el mismo{"\n"}correo en
          sus teléfonos para compartir el progreso.
        </Text>
        <Pressable onPress={() => router.push("/privacy")}>
          <Text
            style={[
              s.small,
              { textAlign: "center", textDecorationLine: "underline" },
            ]}
          >
            Privacidad y cuidado de sus datos
          </Text>
        </Pressable>
      </View>
      <CreatorFooter />
    </Screen>
  );
}
