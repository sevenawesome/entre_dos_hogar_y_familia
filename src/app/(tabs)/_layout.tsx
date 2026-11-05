import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../components/ui";
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: "#879087",
        tabBarStyle: {
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
              color={focused ? colors.rose : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="levels"
        options={{
          title: "Nuestro camino",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="trail-sign-outline"
              size={size}
              color={focused ? colors.rose : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: "Recuerdos",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="book-outline"
              size={size}
              color={focused ? colors.rose : colors.muted}
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
              color={focused ? colors.rose : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="information"
        options={{
          title: "Información",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="information-circle-outline"
              size={size}
              color={focused ? colors.rose : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
