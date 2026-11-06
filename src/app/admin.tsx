import { Redirect, useLocalSearchParams } from "expo-router";
export default function Admin() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const mapped =
    section === "roles"
      ? "roles"
      : section === "email"
        ? "emails"
        : section === "levels"
          ? "levels"
          : section === "families"
            ? "families"
            : "settings";
  return (
    <Redirect
      href={{ pathname: "/(tabs)/administration", params: { section: mapped } }}
    />
  );
}
