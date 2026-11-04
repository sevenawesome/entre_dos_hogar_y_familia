import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, s } from "../components/ui";
export default function Privacy() {
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={s.link}>← Volver</Text>
      </Pressable>
      <Heading
        eyebrow="UN ESPACIO COMPARTIDO"
        title="Sus datos, con cuidado."
      />
      <Card>
        <Text style={s.sectionTitle}>Lo que guardamos</Text>
        <Text style={s.body}>
          El correo de acceso, los nombres o apodos de la familia, la fecha de
          matrimonio y los cumpleaños que agreguen, sus retos completados, las
          notas y la reflexión final. Si activan recordatorios, guardamos el
          identificador de notificaciones, la zona horaria y el horario de cada
          teléfono.
        </Text>
        <Text style={s.sectionTitle}>Una cuenta para los dos</Text>
        <Text style={s.body}>
          Toda la información de esta cuenta es compartida con tu pareja. Usen
          una contraseña segura y eviten guardar información que prefieran
          mantener privada.
        </Text>
        <Text style={s.sectionTitle}>Recordatorios</Text>
        <Text style={s.body}>
          Los avisos pueden aparecer en la pantalla bloqueada e incluyen el
          título del reto pendiente o un saludo con los años de matrimonio en su
          aniversario, o el nombre y la edad de quien cumple años. Nunca
          incluyen sus notas ni respuestas. Pueden pausar los avisos desde
          Nosotros o desde los ajustes del teléfono.
        </Text>
        <Text style={s.sectionTitle}>Sus datos en Firebase</Text>
        <Text style={s.body}>
          La cuenta y los datos se procesan en Firebase de Google; las
          notificaciones pasan por Expo y los servicios de Apple o Google. La
          demostración guarda su progreso únicamente en este dispositivo.
        </Text>
        <Text style={s.sectionTitle}>Eliminar la cuenta</Text>
        <Text style={s.body}>
          En Nosotros pueden eliminar la cuenta y sus datos compartidos. La
          eliminación afecta a los dos teléfonos y es permanente.
        </Text>
        <Text style={s.sectionTitle}>El bienestar va primero</Text>
        <Text style={s.body}>
          Pueden adaptar o pausar cualquier actividad. Si existen miedo,
          amenazas, control o violencia, estos retos no sustituyen apoyo
          profesional ni medidas de seguridad.
        </Text>
      </Card>
    </Screen>
  );
}
