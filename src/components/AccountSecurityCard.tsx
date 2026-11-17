import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useApp } from "../store";
import { Card, Notice, colors, s } from "./ui";

export function AccountSecurityCard() {
  const { demo } = useApp();
  return (
    <Card>
      <View style={s.row}>
        <Ionicons
          name="shield-checkmark-outline"
          size={27}
          color={colors.ocean}
        />
        <Text style={s.sectionTitle}>Acceso y seguridad</Text>
      </View>
      <Text style={s.body}>
        La contraseña pertenece a la cuenta compartida. Coordinen el cambio
        entre los dos. Su familia y su progreso se conservan.
      </Text>
      {demo && <Notice text="Estas opciones requieren una cuenta real." />}
      {(
        [
          [
            "/password-change",
            "lock-closed-outline",
            "Cambiar contraseña",
            "Con tu contraseña actual",
          ],
          [
            "/password-recovery",
            "mail-outline",
            "Recuperar acceso",
            "Recibe un enlace en su correo",
          ],
        ] as const
      ).map(([path, icon, title, subtitle]) => (
        <Pressable
          key={path}
          accessibilityRole="button"
          disabled={demo}
          onPress={() => router.push(path)}
          style={[
            s.row,
            {
              minHeight: 76,
              borderTopWidth: 1,
              borderTopColor: colors.line,
              paddingTop: 14,
              opacity: demo ? 0.45 : 1,
            },
          ]}
        >
          <View
            style={{
              padding: 12,
              borderRadius: 14,
              backgroundColor: colors.mist,
            }}
          >
            <Ionicons name={icon} size={22} color={colors.ocean} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>{title}</Text>
            <Text style={s.small}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.muted} />
        </Pressable>
      ))}
    </Card>
  );
}
