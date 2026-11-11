import { Text, Pressable } from "react-native";
import { router } from "expo-router";
import { openURL } from "expo-linking";
import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../../store";
import { helpSections } from "../../domain/help";
import { CreatorFooter } from "../../components/CreatorFooter";
import {
  Screen,
  Heading,
  Card,
  Button,
  Notice,
  colors,
  s,
} from "../../components/ui";
export default function Information() {
  const { settings, isAdmin, demo, inbox } = useApp();
  const [expanded, setExpanded] = useState<string | null>(
    helpSections[0].title,
  );
  const [error, setError] = useState(false);
  const visit = (url: string) => {
    openURL(url).catch(() => setError(true));
  };
  return (
    <Screen>
      <Heading
        eyebrow="PARA SACARLE PROVECHO, JUNTOS"
        title="Información"
        subtitle="Todo lo que necesitan saber para hacer de los pequeños retos un hábito compartido."
      />
      <Button
        secondary
        title={`Mensajes para ustedes${inbox.length ? ` · ${inbox.length}` : ""}`}
        onPress={() => router.push("/inbox")}
      />
      <Button
        secondary
        title="Nuestros recuerdos y reflexiones"
        onPress={() => router.push("/memories")}
      />
      <Card style={{ backgroundColor: colors.champagne }}>
        <Ionicons name="heart-outline" size={30} color={colors.navy} />
        <Text style={s.sectionTitle}>Su momento empieza aquí</Text>
        <Text style={s.body}>
          Repasen la bienvenida cuando lo necesiten. La guía completa permanece
          en esta pestaña.
        </Text>
        <Button
          title="Volver a ver la guía inicial"
          onPress={() => router.push("/guide")}
        />
      </Card>
      {helpSections.map((section) => (
        <Card key={section.title}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: expanded === section.title }}
            onPress={() =>
              setExpanded(expanded === section.title ? null : section.title)
            }
            style={s.row}
          >
            <Text style={[s.label, { flex: 1, lineHeight: 22 }]}>
              {section.title}
            </Text>
            <Ionicons
              name={expanded === section.title ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.navy}
            />
          </Pressable>
          {expanded === section.title && (
            <Text style={s.body}>{section.body}</Text>
          )}
        </Card>
      ))}
      <Button
        secondary
        title="Privacidad y sus datos"
        onPress={() => router.push("/privacy")}
      />
      {!!(settings.supportEmail || settings.supportUrl) && (
        <Card>
          <Text style={s.sectionTitle}>Estamos para ayudar</Text>
          {!!settings.supportEmail && (
            <Pressable
              accessibilityRole="link"
              onPress={() => visit(`mailto:${settings.supportEmail}`)}
            >
              <Text style={s.link}>{settings.supportEmail}</Text>
            </Pressable>
          )}
          {!!settings.supportUrl && (
            <Button
              secondary
              title="Visitar la página de soporte"
              onPress={() => visit(settings.supportUrl)}
            />
          )}
        </Card>
      )}
      {error && (
        <Notice text="No pudimos abrir el enlace. Revisa tu conexión." />
      )}
      {(isAdmin || demo) && (
        <Button
          secondary
          icon="settings-outline"
          title={
            demo
              ? "Vista previa de administración"
              : "Administrar Amor que permanece"
          }
          onPress={() => router.push("/(tabs)/administration")}
        />
      )}
      <CreatorFooter />
    </Screen>
  );
}
