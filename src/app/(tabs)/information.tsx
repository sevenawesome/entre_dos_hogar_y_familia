import { Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { openURL } from "expo-linking";
import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../../store";
import { helpSections } from "../../domain/help";
import { CreatorFooter } from "../../components/CreatorFooter";
import { SectionTabs } from "../../components/SectionTabs";
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
  const { section: requested } = useLocalSearchParams<{ section?: string }>();
  const section =
    requested === "messages" || requested === "support" ? requested : "guide";
  const [expanded, setExpanded] = useState<string | null>(
    helpSections[0].title,
  );
  const [error, setError] = useState(false);
  const visit = (url: string) => {
    openURL(url).catch(() => setError(true));
  };
  return (
    <Screen>
      <Heading eyebrow="PARA SACARLE PROVECHO, JUNTOS" title="Información" />
      <SectionTabs
        selected={section}
        options={[
          {
            id: "guide",
            title: "Guía",
            icon: "book-outline",
            description:
              "Todo lo que necesitan saber para hacer de los pequeños retos un hábito compartido.",
          },
          {
            id: "messages",
            title: "Mensajes",
            icon: "mail-outline",
            description:
              "Su bandeja de acompañamiento y los recuerdos de sus retos y celebraciones.",
            count: inbox.length,
          },
          {
            id: "support",
            title: "Ayuda",
            icon: "help-buoy-outline",
            description:
              "Contacto, privacidad y ayuda para cuidar su experiencia en la app.",
          },
        ]}
        onSelect={(key) => {
          router.setParams({ section: key });
          setError(false);
        }}
      />
      {section === "messages" && (
        <>
          <Card style={{ backgroundColor: colors.mist }}>
            <Ionicons
              name="mail-unread-outline"
              size={30}
              color={colors.ocean}
            />
            <Text style={s.sectionTitle}>Mensajes para ustedes</Text>
            <Text style={s.body}>
              {inbox.length
                ? `Tienen ${inbox.length} ${inbox.length === 1 ? "mensaje guardado" : "mensajes guardados"} en su bandeja.`
                : "Aquí encontrarán los mensajes que reciban del equipo y las felicitaciones de otras familias."}
            </Text>
            <Button
              secondary
              title={`Mensajes para ustedes${inbox.length ? ` · ${inbox.length}` : ""}`}
              onPress={() => router.push("/inbox")}
            />
          </Card>
          <Card>
            <Ionicons name="heart-outline" size={30} color={colors.love} />
            <Text style={s.sectionTitle}>Su historia se queda con ustedes</Text>
            <Text style={s.body}>
              Vuelvan a las notas de sus retos, las reflexiones de cada nivel y
              las felicitaciones de aniversario.
            </Text>
            <Button
              secondary
              title="Nuestros recuerdos y reflexiones"
              onPress={() => router.push("/memories")}
            />
          </Card>
        </>
      )}
      {section === "guide" && (
        <>
          <Card style={{ backgroundColor: colors.champagne }}>
            <Ionicons name="heart-outline" size={30} color={colors.navy} />
            <Text style={s.sectionTitle}>Su momento empieza aquí</Text>
            <Text style={s.body}>
              Repasen la bienvenida cuando lo necesiten. La guía completa
              permanece en esta pestaña.
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
                  name={
                    expanded === section.title ? "chevron-up" : "chevron-down"
                  }
                  size={18}
                  color={colors.navy}
                />
              </Pressable>
              {expanded === section.title && (
                <Text style={s.body}>{section.body}</Text>
              )}
            </Card>
          ))}
        </>
      )}
      {section === "support" && (
        <>
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
          {!settings.supportEmail && !settings.supportUrl && (
            <Notice text="El equipo todavía no ha publicado un contacto de soporte. Mientras tanto, pueden consultar Guía para resolver las dudas más frecuentes." />
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
        </>
      )}
    </Screen>
  );
}
