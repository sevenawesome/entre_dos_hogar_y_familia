import { Image, Modal, ScrollView, Text, View } from "react-native";
import { useApp } from "../store";
import type { MessageAttachment } from "../domain/attachments";
import { MessageAttachments } from "./MessageAttachments";
import { Button, Card, Notice, s } from "./ui";
export function DeliveryPreviewModal({
  email = false,
  name,
  address,
  title,
  body,
  attachments = [],
  reason,
  error,
  busy,
  onClose,
  onConfirm,
  confirmationLabel,
  recipientSummary,
  closeLabel = "Cerrar vista previa",
}: {
  email?: boolean;
  name: string;
  address?: string;
  title: string;
  body: string;
  attachments?: MessageAttachment[];
  reason?: string;
  error?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  confirmationLabel?: string;
  recipientSummary?: string;
  closeLabel?: string;
}) {
  const app = useApp();
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#06264AC9",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <ScrollView
          style={{ maxHeight: "92%", width: "100%", maxWidth: 520 }}
          contentContainerStyle={{ gap: 12 }}
        >
          <Card>
            <Button
              secondary
              title={closeLabel}
              disabled={busy}
              onPress={onClose}
            />
            <Text style={s.eyebrow}>
              {onConfirm
                ? "REVISAR ANTES DE ENVIAR"
                : email
                  ? "CORREO"
                  : "MENSAJE PARA USTEDES"}
            </Text>
            {email && (
              <>
                <Image
                  source={require("../../assets/logo.png")}
                  style={{ width: "100%", height: 110 }}
                  resizeMode="contain"
                />
                <Text style={[s.small, { textAlign: "center" }]}>
                  {app.branding.byline}
                </Text>
              </>
            )}
            <Text style={s.small}>
              Para {name}
              {address ? ` · ${address}` : ""}
            </Text>
            <Text style={s.sectionTitle}>{title}</Text>
            {!!recipientSummary && <Notice text={recipientSummary} />}
            <Text style={s.body}>{body}</Text>
            <MessageAttachments items={attachments} />
            {!!error && <Notice error text={error} />}
            {onConfirm && (
              <>
                {!!reason && <Notice text={reason} />}
                <Button
                  title={
                    confirmationLabel ??
                    (email
                      ? "Confirmar y poner correo en cola"
                      : "Confirmar y enviar a su bandeja")
                  }
                  disabled={!!reason}
                  busy={busy}
                  onPress={onConfirm}
                />
              </>
            )}
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}
