import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, firebaseConfigured } from "../services/firebase";
import { startDemo } from "../store";
import { friendlyError } from "../services/api";
import { Brand, BrandMark } from "../components/Brand";
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
      if (signup)
        await createUserWithEmailAndPassword(auth!, email.trim(), password);
      else await signInWithEmailAndPassword(auth!, email.trim(), password);
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
    try {
      await sendPasswordResetEmail(auth!, email.trim());
      setInfo(
        "Si el correo está registrado, recibirás un enlace para recuperar el acceso.",
      );
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  return (
    <Screen>
      <View style={{ alignItems: "center", paddingTop: 20, gap: 15 }}>
        <Brand />
        <LinearGradient
          colors={["#FFCABD", "#FFD9E5", "#EBD7FF"]}
          style={{
            height: 180,
            width: "100%",
            borderRadius: 100,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 83,
                height: 112,
                borderRadius: 50,
                borderWidth: 2,
                borderColor: colors.rose,
                transform: [{ rotate: "-23deg" }],
                marginRight: -21,
              }}
            />
            <View
              style={{
                width: 83,
                height: 112,
                borderRadius: 50,
                borderWidth: 2,
                borderColor: colors.violet,
                transform: [{ rotate: "23deg" }],
              }}
            />
          </View>
          <View style={{ position: "absolute" }}>
            <BrandMark size={54} />
          </View>
        </LinearGradient>
        <Text style={[s.eyebrow, { marginTop: 10 }]}>
          UN MOMENTO PARA USTEDES
        </Text>
        <Text
          style={{
            fontFamily: serif,
            fontSize: 38,
            lineHeight: 43,
            textAlign: "center",
            color: colors.ink,
          }}
        >
          El amor se cuida.{"\n"}Un día a la vez.
        </Text>
        <Text style={[s.body, { textAlign: "center" }]}>
          Pequeños retos para volver a encontrarse,{"\n"}escucharse y crecer
          juntos.
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
                borderBottomColor: signup === value ? colors.rose : colors.line,
                paddingBottom: 12,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "600",
                  color: signup === value ? colors.rose : colors.muted,
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
        {!!error && <Notice text={error} error />}
        {!!info && <Notice text={info} />}
        <Button
          title={signup ? "Empezar nuestro camino" : "Entrar a nuestro espacio"}
          busy={busy}
          disabled={!firebaseConfigured}
          onPress={submit}
        />
        {!signup && firebaseConfigured && (
          <Pressable onPress={reset}>
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
