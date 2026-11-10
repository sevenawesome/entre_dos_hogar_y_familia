import { Tabs, usePathname } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../components/ui";
import { useApp } from "../../store";
export default function TabLayout() {
  const { isAdmin, demo } = useApp();
  const adminArea = usePathname() === "/administration";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: "#879087",
        tabBarStyle: {
          display: adminArea ? "none" : "flex",
          backgroundColor: colors.background,
          borderTopColor: colors.line,
          minHeight: 78,
          paddingTop: 10,
          paddingBottom: 16,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: "600", marginTop: 3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoy",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="sunny-outline"
              size={size}
              color={focused ? colors.navy : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="levels"
        options={{
          title: "Camino",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="trail-sign-outline"
              size={size}
              color={focused ? colors.navy : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          href: null,
          title: "Recuerdos",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="book-outline"
              size={size}
              color={focused ? colors.navy : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Comunidad",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="heart-circle-outline"
              color={focused ? colors.navy : colors.muted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Nosotros",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="people-outline"
              size={size}
              color={focused ? colors.navy : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="information"
        options={{
          title: "Info",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="information-circle-outline"
              size={size}
              color={focused ? colors.navy : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="administration"
        options={{
          title: "Admin",
          href: isAdmin || demo ? undefined : null,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="shield-checkmark-outline"
              color={focused ? colors.navy : colors.muted}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
