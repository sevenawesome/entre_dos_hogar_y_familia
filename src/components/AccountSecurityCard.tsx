import { Text } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { Button, Card, Notice, s } from "./ui";

export function AccountSecurityCard() {
  const { demo } = useApp();
  return (
    <Card>
      <Text style={s.sectionTitle}>Seguridad de su cuenta</Text>
      <Text style={s.body}>
        La contraseña pertenece a la cuenta compartida. Coordinen el cambio
        entre los dos. Su familia y su progreso se conservan.
      </Text>
      {demo && <Notice text="Estas opciones requieren una cuenta real." />}
      <Button
        secondary
        title="Cambiar contraseña"
        icon="lock-closed-outline"
        disabled={demo}
        onPress={() => router.push("/password-change")}
      />
      <Button
        secondary
        title="Recuperar contraseña por correo"
        icon="mail-outline"
        disabled={demo}
        onPress={() => router.push("/password-recovery")}
      />
    </Card>
  );
}
