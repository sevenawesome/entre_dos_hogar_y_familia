export const GUIDE_VERSION = 1;
export const guideKey = (uid: string) =>
  `@entre-dos/guide-v${GUIDE_VERSION}/${uid}`;
export const guideSteps = [
  {
    icon: "people-outline",
    title: "Un espacio para los dos",
    body: "Creen una cuenta familiar y usen el mismo correo y contraseña en ambos teléfonos. Registren la fecha de su matrimonio y una foto familiar: pueden tomarla con la cámara o elegirla de su galería. Los cumpleaños son opcionales. Lo que escriban, sus fechas y sus avances será compartido.",
  },
  {
    icon: "heart-outline",
    title: "Un reto, sin prisa",
    body: "En Hoy, pulsen una sola vez «Comenzar nuestro primer reto» para empezar de inmediato. Hagan la actividad y conversen; después marquen «Lo hicimos juntos». Si queda pendiente, seguirá esperándolos. El siguiente se abre 24 horas después de completar el anterior.",
  },
  {
    icon: "ribbon-outline",
    title: "Su camino crece con ustedes",
    body: "Al terminar los retos, respondan juntos la reflexión final para conseguir el nivel. El siguiente se desbloquea si ya está publicado. Si aún no hay otro, sus logros y recuerdos quedan guardados.",
  },
  {
    icon: "notifications-outline",
    title: "Háganle espacio a su momento",
    body: "En Nosotros, cada teléfono puede activar sus recordatorios y elegir un horario. Si un reto queda pendiente, volveremos a recordarlo. También recibirán saludos para su aniversario y los cumpleaños que registren.",
  },
  {
    icon: "book-outline",
    title: "Que el hábito se quede",
    body: "Vuelvan a Recuerdos, repitan las prácticas que les hicieron bien y adapten las actividades a su realidad. En Información encontrarán siempre esta guía y los detalles. El bienestar y el consentimiento de ambos van primero.",
  },
] as const;
export const helpSections = [
  {
    title: "Felicitaciones que se vuelven recuerdos",
    body: "El día del aniversario, las familias participantes con correo verificado pueden pulsar «Felicitar por su aniversario» en Comunidad. Solo se permite una felicitación por familia remitente y aniversario, aunque usen dos teléfonos. La pareja la recibe en privado y puede releerla en Recuerdos → Recuerdos de nuestros aniversarios. Los mensajes se conservan por año, incluso después de la celebración. Con avisos habilitados, el teléfono notifica cuando recibe el mensaje al abrir o sincronizar la app; no se garantiza un aviso inmediato con la app cerrada. Al eliminar una cuenta se eliminan también sus felicitaciones enviadas y recibidas.",
  },
  {
    title: "Comunidad y privacidad",
    body: "Participar es opcional. En Nosotros elijan un nombre público, su foto y si desean mostrar aniversario o retos y niveles conseguidos. Compartir el aniversario publica su fecha de matrimonio entre cuentas registradas. Pueden autorizar por separado el cumpleaños de cada integrante: se muestran nombre, foto, día y mes. El año de nacimiento, la edad, los correos, notas y cuestionarios no se publican. Pueden retirar su perfil en cualquier momento; otras personas podrían conservar lo que ya vieron.",
  },
  {
    title: "Mensajes de acompañamiento",
    body: "La administración puede escribir a una familia. Sus mensajes aparecen en Información → Mensajes para ustedes al abrir o sincronizar la app. Con avisos habilitados, puede mostrarse una notificación local al recibir el mensaje. Esta versión sin servidor no garantiza avisos remotos con la app cerrada.",
  },
  {
    title: "Fotos y consumo gratuito",
    body: "La foto familiar es obligatoria al registrarse; pueden usar cámara o galería. Se mantiene privada hasta que decidan participar en Comunidad. Las fotos familiares e individuales se convierten en miniaturas JPEG; no se guarda el original. Toquen una foto para ampliarla. La familiar se comparte al participar en Comunidad; las individuales solo al autorizar el cumpleaños de esa persona. La aplicación usa Firebase Spark dentro de sus cuotas, sin Cloud Functions ni Storage. Los datos de comunidad y administración se cargan por páginas para cuidar ese consumo.",
  },
  {
    title: "Qué encontrarán en cada pestaña",
    body: "Hoy muestra el nivel actual y el reto pendiente. Nuestro camino reúne los niveles y lo que falta para desbloquearlos. Desde Información pueden entrar a Recuerdos para ver retos, notas y reflexiones. Comunidad muestra solo familias que eligieron compartir su perfil. Nosotros permite editar la familia y configurar avisos. Información contiene esta ayuda.",
  },
  {
    title: "Completar un reto y guardar el progreso",
    body: "Hagan la actividad y conversen. La nota es opcional y compartida. Confirmen que ambos participaron y están de acuerdo antes de completar. Basta que uno lo marque: la cuenta compartida sincroniza el resultado en los dos teléfonos. En modo real se necesita conexión para confirmar el guardado.",
  },
  {
    title: "Un día a la vez",
    body: "El primer reto se abre al pulsar Comenzar, sin esperar al día siguiente. Cada reto permanece pendiente hasta completarlo, aunque pasen varios días. Al marcar «Lo hicimos juntos» comienza la espera de 24 horas para el siguiente, también entre niveles. Firebase valida la espera con la hora del servidor. Abrir la app o leer el reto no lo completa ni reinicia esa espera. No se saltan retos y no pierden lo conseguido por tomarse un descanso.",
  },
  {
    title: "Conseguir niveles y descubrir capítulos",
    body: "Completen todos los retos y respondan cada pregunta de la reflexión final. Ese cierre consigue el nivel y desbloquea su sucesor publicado. El nivel actual aparece resaltado. Los nuevos niveles llegan desde el catálogo sin instalar otra versión. Si no hay otro disponible, pueden volver a los recuerdos mientras aparece el próximo.",
  },
  {
    title: "Recordatorios en ambos teléfonos",
    body: "Al comenzar el recorrido, se solicita el permiso para los avisos. En cada teléfono pueden elegir un horario desde Nosotros; cambiarlo no adelanta los retos. Se programa un aviso diario con el último reto sincronizado. Si hay una espera, indica desde cuándo estará disponible. El mismo reto se recuerda hasta completarlo y sincronizar su avance. Los avisos no consultan Firebase antes de aparecer: si tu pareja completa desde otro teléfono, abre la app para actualizar la programación. La entrega depende de permisos y del sistema del teléfono. Las pausas administrativas y los niveles nuevos se conocen al sincronizar. Al tocar el aviso se abre Hoy. Pueden pausar los avisos o cerrar sesión en ese dispositivo.",
  },
  {
    title: "Aniversario y categorías de bodas",
    body: "La fecha de matrimonio es obligatoria al registrar o editar la familia. Permite calcular los años ya cumplidos, el siguiente aniversario y su aro de cuenta regresiva. Toquen las bodas actuales o próximas para conocer el significado y una propuesta para celebrarlas. Los nombres varían por tradición y las fuentes están en el catálogo. Para fechas del 29 de febrero, se usa el 28 en años no bisiestos.",
  },
  {
    title: "Cumpleaños familiares",
    body: "Las fechas de nacimiento son opcionales para ambos integrantes y sus hijos. Agreguen una foto individual en Nosotros para reconocer a quien cumple años. En Comunidad aparecen los cumpleaños autorizados de los próximos 30 días, sin edades ni año de nacimiento. Administración → Celebraciones permite filtrar cumpleaños y ver 30 días o todo el año. Sirven para calcular las edades, el siguiente cumpleaños y la barra anual. Los saludos de aniversario y cumpleaños pueden continuar después de terminar todos los niveles si los avisos están activos.",
  },
  {
    title: "Confirmar el correo de la cuenta",
    body: "Al registrarse, Firebase envía un enlace de verificación al correo compartido. Ábranlo y pulsen «Ya confirmé mi correo» en Nosotros. También pueden solicitar otro enlace y revisar spam. La verificación no impide comenzar los retos; ayuda a confirmar que tienen acceso a su correo.",
  },
  {
    title: "Recuperar o cambiar la contraseña",
    body: "Si olvidaron la contraseña, escriban su correo en la pantalla de acceso y pulsen «Olvidé la contraseña». Recibirán un enlace para elegir otra; revisen también spam. Con la sesión iniciada, vayan a Nosotros → Seguridad de su cuenta → Cambiar contraseña: necesitarán la actual y confirmar la nueva. También pueden solicitar recuperación por correo desde ahí. El cambio afecta a la cuenta compartida: usen la nueva contraseña en ambos teléfonos cuando deban iniciar sesión de nuevo. La familia y el progreso se conservan.",
  },
  {
    title: "Correos de su cuenta",
    body: "Al completar el registro y verificar la dirección compartida podrán recibir una bienvenida, una felicitación al conseguir cada nivel y avisos manuales del equipo. La administración configura estos envíos; no se mandan correos diarios de retos, cumpleaños ni aniversarios. Cloudflare prepara el envío y Resend lo manda a la dirección verificada. No se incluyen sus notas, cuestionarios ni fotos privadas; el equipo puede adjuntar expresamente documentos o imágenes al redactar un mensaje. Cada correo incluye un enlace de baja que la administración respeta. La entrega depende de la cuota y del proveedor. Los avisos del teléfono y los correos de acceso de Firebase son independientes.",
  },
  {
    title: "Una cuenta y datos compartidos",
    body: "Ambos pueden leer las notas, respuestas y fechas guardadas. Los avisos locales pueden mostrar un saludo con el nombre de quien cumple años. Las notas y reflexiones nunca se incluyen. Usen una contraseña segura y guarden solo lo que deseen compartir.",
  },
  {
    title: "Pausar, salir o desactivar la cuenta",
    body: "Pausar avisos afecta al teléfono configurado. Cerrar sesión detiene los avisos de ese teléfono. Desactivar la cuenta desde Nosotros cierra el acceso de ambos y oculta la familia. Los datos y fotos quedan conservados en privado; el propietario puede restablecerla desde Admin → Cuentas y reinicio → Desactivadas. La eliminación total desde Admin borra la cuenta y sus datos sin recuperación. Se necesita un inicio de sesión reciente.",
  },
  {
    title: "Cuidarse también es adaptar o detenerse",
    body: "Ajusten cada actividad a su energía, tiempo y circunstancias. Ninguna propuesta obliga a hablar, tocarse o aceptar algo que no desean. Si hay miedo, amenazas, control o violencia, los retos no sustituyen apoyo profesional ni medidas de protección.",
  },
  {
    title: "Qué permite la demostración",
    body: "La demostración guarda los datos únicamente en este dispositivo o navegador. La comunidad y la administración usan ejemplos ficticios y no permiten envíos ni cambios remotos. Permite conocer la experiencia y el avance diario, pero no comparte datos entre teléfonos ni envía notificaciones reales.",
  },
];
