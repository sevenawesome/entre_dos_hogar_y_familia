import { useState, type PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { AdminSection } from "../domain/admin-navigation";
import { Notice } from "./ui";

export function AdminWorkspace({
  children,
  sections,
  current,
  demo,
  counts,
}: PropsWithChildren<{
  sections: readonly AdminSection[];
  current?: AdminSection;
  demo: boolean;
  counts?: { families: number; support: number; dates: number };
}>) {
  const [help, setHelp] = useState(false);
  return (
    <SafeAreaView style={a.safe}>
      <View style={a.topbar}>
        <View style={a.identity}>
          <View style={a.shield}>
            <Ionicons name="shield-checkmark" size={22} color="#E8C77D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={a.overline}>AMOR QUE PERMANECE</Text>
            <Text style={a.brand}>Administración</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a la aplicación familiar"
          onPress={() => router.replace("/(tabs)")}
          style={a.exit}
        >
          <Ionicons name="exit-outline" size={19} color="white" />
          <Text style={a.exitText}>Salir</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={a.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={a.content}
        >
          {demo && (
            <Notice text="Demostración · puedes explorar las herramientas y sus guías. No se guardan cambios ni se contacta a familias." />
          )}
          {!current ? (
            <>
              <View style={a.hero}>
                <View style={a.badge}>
                  <View style={a.dot} />
                  <Text style={a.badgeText}>ESPACIO DE GESTIÓN</Text>
                </View>
                <Text accessibilityRole="header" style={a.heroTitle}>
                  Acompañar también{"\n"}es cuidar los detalles.
                </Text>
                <Text style={a.heroDescription}>
                  Elige una herramienta. Cada sección tiene su guía y muestra
                  solo las opciones disponibles para tu cuenta.
                </Text>
                {counts && (
                  <View style={a.stats}>
                    {[
                      [counts.families, "Familias cargadas"],
                      [counts.support, "Por acompañar"],
                      [counts.dates, "Fechas próximas"],
                    ].map(([value, label]) => (
                      <View key={label} style={{ flex: 1, gap: 4 }}>
                        <Text style={a.statValue}>{value}</Text>
                        <Text style={a.statLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {["Acompañar", "Comunicar", "Organizar"].map((group) => {
                const items = sections.filter((item) => item.group === group);
                return items.length ? (
                  <View key={group} style={{ gap: 12 }}>
                    <Text style={a.group}>{group}</Text>
                    <View style={a.grid}>
                      {items.map((item) => (
                        <Pressable
                          key={item.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.title}. ${item.description}`}
                          onPress={() => router.setParams({ section: item.id })}
                          style={({ pressed }) => [
                            a.module,
                            pressed && { opacity: 0.75 },
                          ]}
                        >
                          <View style={a.moduleTop}>
                            <View style={a.moduleIcon}>
                              <Ionicons
                                name={item.icon}
                                size={23}
                                color="#245B79"
                              />
                            </View>
                            <Ionicons
                              name="arrow-forward"
                              size={17}
                              color="#8A9BAA"
                            />
                          </View>
                          <Text style={a.moduleTitle}>{item.title}</Text>
                          <Text style={a.moduleDescription}>
                            {item.description}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null;
              })}
              {!sections.length && (
                <Notice text="El propietario todavía no te ha asignado herramientas administrativas." />
              )}
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.setParams({ section: "" })}
                style={a.breadcrumb}
              >
                <Ionicons name="grid-outline" size={17} color="#245B79" />
                <Text style={a.breadcrumbText}>Panel de herramientas</Text>
                <Ionicons name="chevron-forward" size={14} color="#8293A3" />
              </Pressable>
              <View style={a.sectionHeading}>
                <View style={a.sectionIcon}>
                  <Ionicons name={current.icon} size={26} color="#E8C77D" />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text accessibilityRole="header" style={a.sectionTitle}>
                    {current.title}
                  </Text>
                  <Text style={a.sectionDescription}>
                    {current.description}
                  </Text>
                </View>
              </View>
              <View style={a.help}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: help }}
                  accessibilityLabel={`Cómo usar ${current.title}`}
                  onPress={() => setHelp(!help)}
                  style={a.helpToggle}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={21}
                    color="#245B79"
                  />
                  <Text style={a.helpTitle}>Cómo usar esta sección</Text>
                  <Ionicons
                    name={help ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#245B79"
                  />
                </Pressable>
                {help && (
                  <View style={a.helpContent}>
                    {current.steps.map((step, index) => (
                      <View key={step} style={a.step}>
                        <Text style={a.stepNumber}>{index + 1}</Text>
                        <Text style={a.stepText}>{step}</Text>
                      </View>
                    ))}
                    <Text style={a.helpNote}>{current.note}</Text>
                  </View>
                )}
              </View>
              {children}
            </>
          )}
          <Text style={a.footer}>ÁREA ADMINISTRATIVA · AMOR QUE PERMANECE</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const a = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#102C46" },
  body: { flex: 1, backgroundColor: "#F0F4F8" },
  topbar: {
    width: "100%",
    maxWidth: 850,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  identity: { flex: 1, flexDirection: "row", gap: 10, alignItems: "center" },
  shield: {
    width: 42,
    height: 46,
    backgroundColor: "#1E415E",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  overline: {
    color: "#B7CAD9",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  brand: { color: "white", fontSize: 18, fontWeight: "700", marginTop: 3 },
  exit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 11,
    borderRadius: 12,
    backgroundColor: "#25455F",
  },
  exitText: { color: "white", fontSize: 12, fontWeight: "600" },
  content: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 38,
    gap: 22,
  },
  hero: { backgroundColor: "#163852", padding: 24, borderRadius: 24, gap: 18 },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#E8C77D" },
  badgeText: {
    color: "#E8C77D",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: "white",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  heroDescription: { color: "#C2D5E3", fontSize: 13, lineHeight: 21 },
  stats: {
    borderTopWidth: 1,
    borderTopColor: "#36566D",
    paddingTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  statValue: { color: "white", fontSize: 26, fontWeight: "700" },
  statLabel: { color: "#C2D5E3", fontSize: 10, lineHeight: 15 },
  group: {
    color: "#617789",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  module: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 120,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCE5EC",
    gap: 11,
  },
  moduleTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moduleIcon: {
    width: 42,
    height: 42,
    backgroundColor: "#EAF2F7",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: { color: "#163852", fontSize: 15, fontWeight: "700" },
  moduleDescription: { color: "#617789", fontSize: 12, lineHeight: 18 },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
    alignSelf: "flex-start",
  },
  breadcrumbText: { color: "#245B79", fontSize: 12, fontWeight: "600" },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 14 },
  sectionIcon: {
    backgroundColor: "#163852",
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#163852",
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sectionDescription: { color: "#617789", fontSize: 13, lineHeight: 20 },
  help: {
    backgroundColor: "#E6EFF5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D2E1EB",
  },
  helpToggle: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  helpTitle: { color: "#245B79", fontSize: 13, fontWeight: "600", flex: 1 },
  helpContent: { paddingHorizontal: 16, paddingBottom: 18, gap: 14 },
  step: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepNumber: {
    color: "#245B79",
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    width: 24,
    height: 24,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "700",
    fontSize: 12,
  },
  stepText: { flex: 1, color: "#2C4C63", fontSize: 13, lineHeight: 21 },
  helpNote: {
    color: "#557085",
    fontSize: 12,
    lineHeight: 19,
    borderTopWidth: 1,
    borderTopColor: "#CCDEE9",
    paddingTop: 12,
  },
  footer: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: "#8293A3",
    textAlign: "center",
    paddingTop: 12,
  },
});
