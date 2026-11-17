import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { disableDevice } from "../services/notifications";
import { friendlyError } from "../services/api";
import { actions, store, useApp } from "../store";
import { Button, Card, Notice, colors, s } from "./ui";

export function LogoutControl({ disabled = false }: { disabled?: boolean }) {
  const { demo } = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión en este teléfono"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 48,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.loveLine,
          backgroundColor: colors.loveMist,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Ionicons name="log-out-outline" color={colors.love} size={23} />
        <Text style={{ color: colors.love, fontWeight: "700", fontSize: 12 }}>
          Cerrar sesión
        </Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#06264AC9",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Card style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
            <Ionicons name="log-out-outline" color={colors.love} size={38} />
            <Text style={s.sectionTitle}>¿Cerrar sesión en este teléfono?</Text>
            <Text style={s.body}>
              Su familia, fotos, retos y recuerdos se conservan. Tu pareja puede
              seguir usando su teléfono. Los recordatorios de este dispositivo
              se pausarán hasta que vuelvas a entrar.
            </Text>
            {!!error && <Notice error text={error} />}
            <Button
              title={demo ? "Salir del ejemplo" : "Sí, cerrar sesión"}
              danger
              busy={busy}
              onPress={logout}
            />
            <Button
              title="Seguir en mi cuenta"
              secondary
              disabled={busy}
              onPress={() => setOpen(false)}
            />
          </Card>
        </View>
      </Modal>
    </>
  );
}
