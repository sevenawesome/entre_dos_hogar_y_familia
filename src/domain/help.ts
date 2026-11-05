export const GUIDE_VERSION = 1;
export const guideKey = (uid: string) =>
  `@entre-dos/guide-v${GUIDE_VERSION}/${uid}`;
export const guideSteps = [
  {
    icon: "people-outline",
    title: "Un espacio para los dos",
    body: "Creen una cuenta familiar y usen el mismo correo y contraseña en ambos teléfonos. Lo que escriban, sus fechas y sus avances será compartido.",
  },
  {
    icon: "heart-outline",
    title: "Un reto, sin prisa",
    body: "Abránlo en Hoy, hagan la actividad y conversen sobre la pregunta. Pueden guardar una nota. Cuando ambos estén de acuerdo, marquen «Lo hicimos juntos». El próximo se abre 24 horas después.",
  },
  {
    icon: "ribbon-outline",
    title: "Su camino crece con ustedes",
    body: "Al terminar los retos, respondan juntos la reflexión final para conseguir el nivel. El siguiente se desbloquea si ya está publicado. Si aún no hay otro, sus logros y recuerdos quedan guardados.",
  },
  {
    icon: "notifications-outline",
    title: "Háganle espacio a su momento",
    body: "En Nosotros, cada teléfono puede activar sus recordatorios y elegir un horario. Si un reto queda pendiente, volveremos a recordarlo. El aniversario y los cumpleaños son ayudas opcionales.",
  },
  {
    icon: "book-outline",
    title: "Que el hábito se quede",
    body: "Vuelvan a Recuerdos, repitan las prácticas que les hicieron bien y adapten las actividades a su realidad. En Información encontrarán siempre esta guía y los detalles. El bienestar y el consentimiento de ambos van primero.",
  },
] as const;
export const helpSections = [
  {
    title: "Comunidad y privacidad",
    body: "Participar es opcional. En Nosotros elijan un nombre público, su foto y si desean mostrar aniversario o retos y niveles conseguidos. Compartir el aniversario publica su fecha de matrimonio entre cuentas registradas. No se muestran correos, cumpleaños, datos de hijos, notas ni cuestionarios. Pueden retirar su perfil en cualquier momento; otras personas podrían conservar lo que ya vieron.",
  },
  {
    title: "Mensajes de acompañamiento",
    body: "La administración puede escribir a una familia. Sus mensajes aparecen en Información → Mensajes para ustedes al abrir o sincronizar la app. Con avisos habilitados, puede mostrarse una notificación local al recibir el mensaje. Esta versión sin servidor no garantiza avisos remotos con la app cerrada.",
  },
  {
    title: "Fotos y consumo gratuito",
    body: "La foto se convierte en una miniatura JPEG pequeña; no se guarda el original. Se comparte solo si activan Comunidad. La aplicación usa Firebase Spark dentro de sus cuotas, sin Cloud Functions ni Storage. Los datos de comunidad y administración se cargan por páginas para cuidar ese consumo.",
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
    body: "Se completa un reto cada 24 horas. El siguiente se habilita 24 horas después del último completado. Firebase valida ese intervalo con la hora del servidor. No se avanza automáticamente por dejar pasar días: el reto pendiente continúa esperándolos. No pierden lo conseguido por tomarse un descanso.",
  },
  {
    title: "Conseguir niveles y descubrir capítulos",
    body: "Completen todos los retos y respondan cada pregunta de la reflexión final. Ese cierre consigue el nivel y desbloquea su sucesor publicado. El nivel actual aparece resaltado. Los nuevos niveles llegan desde el catálogo sin instalar otra versión. Si no hay otro disponible, pueden volver a los recuerdos mientras aparece el próximo.",
  },
  {
    title: "Recordatorios en ambos teléfonos",
    body: "Cada persona activa el permiso del teléfono y guarda su horario desde Nosotros. El teléfono programa un aviso general diario; no necesita consultar Firebase para presentarlo. La entrega depende de permisos y del sistema del teléfono. Al abrir la app, se sincroniza el reto correcto. Los cambios de otro teléfono, las pausas administrativas y los niveles nuevos se conocen al sincronizar. Al tocar el aviso se abre Hoy. Pueden pausar los avisos o cerrar sesión en ese dispositivo.",
  },
  {
    title: "Aniversario y categorías de bodas",
    body: "La fecha de matrimonio permite calcular los años ya cumplidos, el siguiente aniversario y su aro de cuenta regresiva. Toquen las bodas actuales o próximas para conocer el significado y una propuesta para celebrarlas. Los nombres varían por tradición y las fuentes están en el catálogo. Para fechas del 29 de febrero, se usa el 28 en años no bisiestos.",
  },
  {
    title: "Cumpleaños familiares",
    body: "Las fechas de nacimiento son opcionales para ambos integrantes y sus hijos. Sirven para calcular las edades, el siguiente cumpleaños y la barra anual. Los saludos de aniversario y cumpleaños pueden continuar después de terminar todos los niveles si los avisos están activos.",
  },
  {
    title: "Una cuenta y datos compartidos",
    body: "Ambos pueden leer las notas, respuestas y fechas guardadas. Los avisos locales pueden mostrar un saludo con el nombre de quien cumple años. Las notas y reflexiones nunca se incluyen. Usen una contraseña segura y guarden solo lo que deseen compartir.",
  },
  {
    title: "Pausar, salir o eliminar la cuenta",
    body: "Pausar avisos afecta al teléfono configurado. Cerrar sesión detiene los avisos de ese teléfono. Eliminar la cuenta familiar desde Nosotros borra la cuenta y los datos compartidos de ambos; se necesita volver a iniciar sesión si la sesión no es reciente.",
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
