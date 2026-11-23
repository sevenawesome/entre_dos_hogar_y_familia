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
          avisos desde Nosotros o desde los ajustes del teléfono. Para enviar
          avisos con la app cerrada guardamos un registro del teléfono vinculado
          a su cuenta, que desactivamos al cerrar sesión y eliminamos al borrar
          definitivamente la cuenta. Los avisos de Administración pueden mostrar
          el título y el texto del mensaje en la pantalla bloqueada. Al tocarlos
          pueden leerlo completo y ver sus adjuntos dentro de la app.
        </Text>
        <Text style={s.sectionTitle}>Su información, protegida</Text>
        <Text style={s.body}>
          Guardamos su cuenta y su información en servicios protegidos para que
          puedan acceder desde ambos teléfonos. Los recordatorios se preparan en
          cada dispositivo y requieren su permiso para aparecer. La demostración
          utiliza ejemplos ficticios y no publica sus datos.
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
          Participar es opcional y está desactivado inicialmente. Para publicar
          deben aceptar las normas. El equipo revisa nombres y fotos públicas
          antes de aprobar su publicación; los cambios requieren una nueva
          revisión. Pueden compartir un alias, su foto y, por separado, el
          aniversario o contadores de retos y niveles. Compartir el aniversario
          publica la fecha de matrimonio entre las cuentas registradas. Cada
          integrante tiene un permiso independiente para mostrar su cumpleaños:
          al autorizarlo se publican su nombre, foto, día y mes, incluidos los
          hijos que decidan compartir. El año de nacimiento, las edades,
          correos, notas y cuestionarios no se publican. Sin ese permiso, las
          fotos individuales quedan en la cuenta familiar. Las fotos se reducen
          a miniaturas; no guardamos los originales. Pueden retirar su perfil,
          aunque otras personas podrían conservar lo que ya vieron. El día de su
          aniversario, otras familias participantes con correo verificado pueden
          enviarles una felicitación por familia. Se conserva de forma privada
          para la pareja y su remitente, asociada al aniversario de ese año.
          Pueden reportar perfiles o felicitaciones y bloquear familias desde
          Comunidad y sus recuerdos. Los bloqueos impiden nuevas felicitaciones
          entre ambas cuentas. El equipo autorizado recibe una copia del
          contenido reportado y el motivo; puede retirarlo o suspender la
          participación. No mostramos la identidad del reportante a la familia
          reportada. Al eliminar una cuenta se eliminan también las
          felicitaciones enviadas y recibidas y sus copias en las bandejas de la
          app.
        </Text>
        <Text style={s.sectionTitle}>Correos opcionales</Text>
        <Text style={s.body}>
          Al completar el registro y verificar su dirección podrán recibir una
          bienvenida, una felicitación al conseguir cada nivel y avisos manuales
          del equipo sobre su cuenta o el programa. La administración configura
          estos envíos y sus límites. No se mandan correos diarios de retos,
          cumpleaños ni aniversarios. Para entregar los correos utilizamos un
          servicio de envío que recibe su dirección y el contenido del mensaje.
          No se envían notas ni cuestionarios de pareja. Los mensajes manuales
          pueden incluir los adjuntos que el administrador elija. Cada correo
          incluye un enlace de baja que la administración no puede anular. Los
          correos de verificación y recuperación de contraseña siguen
          disponibles aunque desactiven los correos opcionales. Guardamos un
          registro de los envíos para evitar duplicados y atender problemas de
          entrega. Que un correo se haya enviado no garantiza que llegue al
          buzón ni que haya sido leído.
        </Text>
        <Text style={s.sectionTitle}>Eliminar la cuenta</Text>
        <Text style={s.body}>
          En Nosotros pueden desactivar la cuenta familiar: se bloquea el acceso
          de ambos y se oculta la familia. Sus datos y fotos quedan privados
          para que el propietario pueda restablecerla desde Administración. Tras
          la recuperación, la familia decide si vuelve a participar en
          Comunidad. También pueden elegir «Eliminar cuenta y datos» en Nosotros
          → Cuenta y acceso, confirmar la contraseña y escribir ELIMINAR MI
          CUENTA. El borrado definitivo elimina el acceso de ambos, sus fotos,
          notas, respuestas, progreso, mensajes y felicitaciones enviadas o
          recibidas. No puede restablecerse. Si se interrumpe la limpieza, el
          servicio la continúa automáticamente. La cuenta propietaria debe
          transferir la propiedad a otro administrador activo y verificado antes
          de eliminarse expresamente. El propietario también puede realizar
          borrados administrativos; los reinicios siempre protegen su cuenta y
          las de administradores. Conservamos únicamente un registro mínimo de
          la solicitud y del resultado del borrado, para completarlo e impedir
          que una sesión anterior vuelva a crear sus datos. Ese registro no
          contiene sus fotos ni el contenido de sus recuerdos. No podemos
          retirar copias de correos o imágenes que otras personas hayan guardado
          fuera de la app. Ambas acciones necesitan conexión e inicio de sesión
          reciente.
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
