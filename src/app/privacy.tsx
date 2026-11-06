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
          notas y la reflexión final, miniaturas familiares e individuales si
          las eligen, el estado de verificación del correo, el inicio del
          recorrido y los mensajes del equipo de acompañamiento. El horario de
          los recordatorios se guarda en cada teléfono. La fecha de matrimonio
          es obligatoria para registrar la familia; las fechas de cumpleaños son
          opcionales.
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
          título del reto y su disponibilidad, un saludo de aniversario o el
          nombre de quien cumple años. Al sincronizar también pueden mostrar
          mensajes de la administración. Nunca incluyen sus notas ni respuestas.
          Pueden pausar los avisos desde Nosotros o desde los ajustes del
          teléfono.
        </Text>
        <Text style={s.sectionTitle}>Sus datos en Firebase</Text>
        <Text style={s.body}>
          La cuenta y los datos se procesan en Firebase de Google. Los avisos se
          programan localmente con Expo y los presenta el sistema del teléfono.
          La demostración guarda su progreso únicamente en este dispositivo.
        </Text>
        <Text style={s.sectionTitle}>Administración y soporte</Text>
        <Text style={s.body}>
          El personal autorizado puede consultar y corregir el perfil básico de
          una familia, consultar fechas familiares y resúmenes de progreso,
          enviar mensajes, pausar avisos y administrar permisos de otras
          cuentas. Los cambios se registran. Las pausas de avisos se aplican al
          sincronizar. El panel administrativo no muestra las notas ni las
          respuestas de pareja ni las fotos individuales privadas.
        </Text>
        <Text style={s.sectionTitle}>Comunidad y foto</Text>
        <Text style={s.body}>
          Participar es opcional y está desactivado inicialmente. Pueden
          compartir un alias, su foto y, por separado, el aniversario o
          contadores de retos y niveles. Compartir el aniversario publica la
          fecha de matrimonio entre las cuentas registradas. Cada integrante
          tiene un permiso independiente para mostrar su cumpleaños: al
          autorizarlo se publican su nombre, foto, día y mes, incluidos los
          hijos que decidan compartir. El año de nacimiento, las edades,
          correos, notas y cuestionarios no se publican. Sin ese permiso, las
          fotos individuales quedan en la cuenta familiar. Las fotos se reducen
          a miniaturas; no guardamos los originales. Pueden retirar su perfil,
          aunque otras personas podrían conservar lo que ya vieron.
        </Text>
        <Text style={s.sectionTitle}>Correos opcionales</Text>
        <Text style={s.body}>
          Solo se activan si lo eligen y verifican su correo. Cloudflare procesa
          las preferencias, fechas familiares y resúmenes necesarios para
          preparar los avisos; Resend recibe la dirección y el contenido que
          debe enviar. No se envían notas, cuestionarios ni fotos. Pueden
          incluir el título del reto, nombres de quienes cumplen años, años de
          matrimonio y mensajes autorizados del equipo. Pueden darse de baja
          desde el correo o desde Nosotros. La aplicación guarda preferencias,
          cola y estados técnicos de envío; un estado aceptado no confirma
          entrega ni lectura.
        </Text>
        <Text style={s.sectionTitle}>Eliminar la cuenta</Text>
        <Text style={s.body}>
          En Nosotros pueden eliminar la cuenta y sus datos compartidos. La
          eliminación afecta a los dos teléfonos y es permanente. Se necesita
          conexión y una sesión reciente. Mantengan la app abierta hasta
          terminar; si se interrumpe, pueden volver a intentar la eliminación.
          Se conserva un identificador técnico de bloqueo para impedir que una
          sesión antigua vuelva a crear datos. El propietario debe transferir su
          rol primero.
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
