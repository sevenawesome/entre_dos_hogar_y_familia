import type { ReactNode } from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, Card, s } from "./ui";

export function SafetyModal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 18,
          backgroundColor: "#06264ACC",
        }}
      >
        <View
          style={{
            maxHeight: "90%",
            width: "100%",
            maxWidth: 650,
            alignSelf: "center",
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingVertical: 12 }}
          >
            <Card>
              <Text accessibilityRole="header" style={s.sectionTitle}>
                {title}
              </Text>
              {children}
              <Button
                secondary
                title="Cerrar"
                disabled={busy}
                onPress={onClose}
              />
            </Card>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
