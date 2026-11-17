import { useState } from "react";
import { Text, View, Pressable, Image } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, firebaseConfigured } from "../services/firebase";
import { store, actions } from "../store";
import { requestEmailVerification } from "../services/email";
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
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const signup = mode === "signup";
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    setError("");
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
                router.setParams({ mode: value ? "signup" : "login" });
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
          <Notice text="El acceso estará disponible al conectar Firebase. Mientras tanto, descubre la app en la presentación visual." />
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
        <Button
          title={signup ? "Empezar nuestro camino" : "Entrar a nuestro espacio"}
          busy={busy}
          disabled={!firebaseConfigured}
          onPress={submit}
        />
        {!signup && firebaseConfigured && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => router.push("/password-recovery")}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={[s.link, { textAlign: "center" }]}>
              Olvidé la contraseña
            </Text>
          </Pressable>
        )}
        <Button
          secondary
          title="Explorar demostración"
          icon="images-outline"
          disabled={busy}
          onPress={() => router.push("/tour")}
        />
        <Text style={[s.small, { textAlign: "center", marginTop: -7 }]}>
          Un recorrido en imágenes por todo lo que podrán hacer.
        </Text>
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
