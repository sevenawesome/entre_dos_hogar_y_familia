import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { colors, s } from "./ui";

export interface SectionOption<Key extends string> {
  id: Key;
  title: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  description: string;
  count?: number;
}

/** Visible section choices: no horizontal scrolling to discover more tabs. */
export function SectionTabs<Key extends string>({
  options,
  selected,
  onSelect,
  disabled = false,
}: {
  options: readonly SectionOption<Key>[];
  selected: Key;
  onSelect: (key: Key) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 16 }}>
      <View style={[s.row, { gap: 7, alignItems: "stretch" }]}>
        {options.map((option) => {
          const active = selected === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              onPress={() => onSelect(option.id)}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                minHeight: 74,
                paddingHorizontal: 6,
                paddingVertical: 12,
                gap: 6,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? colors.navy : colors.mist,
                opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
              })}
            >
              <Ionicons
                name={option.icon}
                size={23}
                color={active ? colors.white : colors.ocean}
              />
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: "700",
                  color: active ? colors.white : colors.ink,
                }}
              >
                {option.title}
                {option.count ? ` · ${option.count}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.body}>
        {options.find((option) => option.id === selected)?.description}
      </Text>
    </View>
  );
}
