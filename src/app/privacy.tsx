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
          notas y la reflexión final, una miniatura familiar obligatoria y las
          individuales si las eligen, las felicitaciones de aniversario, el
          estado de verificación del correo, el inicio del recorrido y los
          mensajes del equipo de acompañamiento. El horario de los recordatorios
          se guarda en cada teléfono. La fecha de matrimonio y una foto familiar
          son obligatorias para registrar la familia; las fechas de cumpleaños
          son opcionales.
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
          mensajes de la administración o felicitaciones de otras familias.
          Nunca incluyen sus notas ni respuestas de los retos. Pueden pausar los
          avisos desde Nosotros o desde los ajustes del teléfono.
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
          aunque otras personas podrían conservar lo que ya vieron. El día de su
          aniversario, otras familias participantes con correo verificado pueden
          enviarles una felicitación por familia. Se conserva de forma privada
          para la pareja y su remitente, asociada al aniversario de ese año. Al
          eliminar una cuenta se eliminan también las felicitaciones enviadas y
          recibidas y sus copias en las bandejas de la app.
        </Text>
        <Text style={s.sectionTitle}>Correos opcionales</Text>
        <Text style={s.body}>
          Al completar el registro y verificar su dirección podrán recibir una
          bienvenida, una felicitación al conseguir cada nivel y avisos manuales
          del equipo sobre su cuenta o el programa. La administración configura
          estos envíos y sus límites. No se mandan correos diarios de retos,
          cumpleaños ni aniversarios. Cloudflare prepara el envío; Resend recibe
          su dirección y el mensaje. No se envían notas, cuestionarios ni fotos.
          Cada correo incluye un enlace de baja que la administración no puede
          anular. Los correos de verificación y recuperación de Firebase siguen
          disponibles. Se conservan colas y estados técnicos; un envío aceptado
          no confirma entrega ni lectura.
        </Text>
        <Text style={s.sectionTitle}>Eliminar la cuenta</Text>
        <Text style={s.body}>
          En Nosotros pueden eliminar la cuenta y sus datos compartidos. El
          propietario del programa también puede eliminar cuentas de familias
          desde la administración, con confirmación y auditoría. Se conservan
          registros técnicos mínimos de eliminación para impedir que sesiones
          antiguas vuelvan a crear datos. Las cuentas administrativas quedan
          protegidas durante un reinicio de familias. La eliminación afecta a
          los dos teléfonos y es permanente. Se necesita conexión y una sesión
          reciente. Mantengan la app abierta hasta terminar; si se interrumpe,
          pueden volver a intentar la eliminación. Se conserva un identificador
          técnico de bloqueo para impedir que una sesión antigua vuelva a crear
          datos. El propietario debe transferir su rol primero.
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
