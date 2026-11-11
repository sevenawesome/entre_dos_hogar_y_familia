# Administración de Amor que permanece

La pestaña Admin aparece para cuentas con rol `owner` o `admin`. Contiene Familias, Celebraciones, Seguimiento, Notificaciones, Correos, Administradores, Niveles y Configuración. El propietario también dispone de Cuentas y reinicio. Solo muestra secciones permitidas para esa cuenta. Consulta la [guía completa de permisos y correo](CORREOS_Y_PERMISOS.md).

## Administradores

En Admin → Administradores selecciona una familia del listado o busca su correo/UID. Activa «Esta cuenta es administradora», elige sus permisos, confirma y guarda. Para retirarle acceso, apaga esa opción y guarda. El permiso pertenece a la cuenta compartida: ambos integrantes lo usan.

Los siete permisos están en español: consultar familias, editar perfiles, enviar notificaciones, enviar correos/gestionar destinatarios, gestionar niveles, configurar la app/correo y gestionar otros administradores. El propietario conserva todos. Nadie puede modificar su propio rol ni el del propietario o conceder permisos superiores a los que tiene. Las modificaciones llevan auditoría y se aplican en reglas de Firebase y Worker, además de la interfaz. Una revocación no borra copias vistas anteriormente.

## Familias, fechas y seguimiento

Familias carga un listado seleccionable por páginas de veinte, filtrable por nombres, familia o correo entre las filas cargadas. También conserva la búsqueda exacta por correo/UID. El mismo selector aparece al preparar mensajes y permisos, cuando se dispone de acceso a familias. El permiso de edición permite cambiar nombres y fechas o pausar recordatorios de una familia; el matrimonio es obligatorio y la zona horaria original se conserva. Los cumpleaños son opcionales. No se muestran notas íntimas, cuestionarios ni fotos individuales privadas.

Fechas reúne cumpleaños y aniversarios de los próximos treinta días. Seguimiento muestra quienes llevan siete días o más sin completar desde su último avance o registro; no es una penalización ni una clasificación pública. Las cifras y fechas corresponden a las familias cargadas, por páginas de veinte, para cuidar Firebase Spark.

## Dos canales separados

Notificaciones y Correos abren automáticamente el listado de familias. El filtro acepta varias palabras en cualquier orden y partes del correo, sin distinguir mayúsculas o tildes. Busca entre las familias cargadas; se pueden cargar otras veinte o abrir la búsqueda por correo exacto/UID. Se muestran cinco resultados iniciales para mantener la pantalla breve y el selector consulta solo los perfiles y resúmenes necesarios. Al elegir una familia, el listado se cierra y muestra «Destinatario elegido» con nombre y correo; «Cambiar familia destinataria» permite volver al listado.

Notificaciones solo guarda un mensaje en la bandeja privada. La familia lo recibe al abrir o sincronizar la app y puede mostrarse un aviso local; no garantiza push inmediato con la app cerrada. No consume correos.

Correos permite buscar destinatario, gestionar administrativamente su recepción, redactar, revisar y confirmar un envío. Tiene permiso independiente y muestra reservas de cuota en UTC. Ajustes de correo requiere configurar la aplicación: remitente, respuesta, categorías, límites y dos plantillas. No hay correos diarios; solo bienvenida tras verificar, nivel conseguido y mensajes manuales. Las bajas firmadas desde los correos se respetan. El envío real sigue desactivado.

## Niveles y configuración

Niveles ofrece un formulario con Datos del nivel, Retos, Preguntas finales y Vista previa. Permite agregar, quitar y reordenar retos, elegir un nivel anterior publicado como prerrequisito y preparar hasta 200 retos y 30 preguntas. Se guardan borradores privados al completar los campos obligatorios. La vista previa abre una ventana independiente con Presentación, Reto y Cuestionario. Reutiliza los mismos componentes de la experiencia de pareja; permite recorrer los retos y cerrar para volver al formulario sin guardar avances. Publicar abre un diálogo con el resumen y exige una confirmación explícita. Un nivel publicado conserva retos, preguntas y recorrido para proteger historiales; se puede mejorar su presentación. El guardado comprueba la revisión cargada para evitar sobrescribir cambios de otro administrador. Puede cargar el catálogo inicial de bodas si no existe; no lo sobrescribe.

Cada nivel publicado después del primero aparece como novedad en Hoy, también para las familias que todavía no terminaron el anterior. «Conocer de qué trata» abre solo título, subtítulo, presentación y cantidades: no muestra actividades ni preguntas. Al confirmar «Entendido, ver en Nuestro camino», la novedad se marca como vista para la cuenta compartida y el nivel sigue en Camino, con su prerrequisito. Esta marca privada se guarda en `families/{uid}/levelNews/{levelId}` y se limpia al eliminar la familia.

En Spark se presenta una notificación local cuando cada teléfono recibe el catálogo al abrir o sincronizar la app, si tiene permiso y avisos habilitados. Se agrupan las publicaciones nuevas y no se repite la misma por teléfono. Tocar el aviso abre la presentación del nivel. No es un push remoto inmediato con la app cerrada, ni consume la cuota de correo. La simulación de publicación de demostración solo modifica la sesión local; no publica en Firebase ni emite avisos.

Configuración reúne mensajes para familias, soporte, aviso de nuevo nivel, texto al terminar todo y habilitación global de notificaciones del teléfono. Incluye vistas de ejemplo del nivel actual, final sin nuevos capítulos y anuncio de nivel nuevo. Los formularios con versión detectan cambios concurrentes y ofrecen recarga. Las claves de proveedores permanecen fuera de la app.

## Comunidad

Participar es opcional. La foto familiar aparece circular, de 72 puntos, y se amplía al tocarla. La familia elige compartir aniversario y contadores; autoriza por separado cumpleaños individuales, con nombre, miniatura y día/mes. Nunca se publican edad, año de nacimiento, correo, notas ni cuestionarios. No se usa Firebase Storage.

## Cuentas y reinicio · solo propietario

El módulo lista cuentas de Firebase Authentication en páginas de diez, incluidas las que todavía no tienen perfil familiar. Se puede revisar una eliminación individual o preparar el reinicio de todas las familias. El reinicio incluye cuentas reales y de prueba que existían al preparar la operación; no clasifica datos dummy automáticamente. Propietarios y administradores quedan protegidos. Para eliminar otra cuenta administrativa primero se debe retirar su rol. Nunca se elimina la cuenta propietaria desde este módulo.

La vista previa muestra total y hasta diez correos. No borra datos. Vence en quince minutos y exige escribir `ELIMINAR N CUENTA(S)` e iniciar sesión en los últimos cinco minutos antes de confirmar. La confirmación es permanente. En demostración el botón final permanece deshabilitado incluso si se escribe la frase.

El Worker verifica la firma RSA del token Firebase, emisor, proyecto, vencimiento, revocación, correo verificado y rol propietario vigente. No acepta un UID del cliente como identidad del operador. Usa un rol IAM personalizado con únicamente `firebaseauth.users.delete`, además de los permisos de lectura Auth y datos que ya tenía. Los documentos `adminDeletionJobs` son inaccesibles desde los clientes.

La limpieza confirmada bloquea nuevas escrituras de esa familia, elimina el acceso Auth y limpia progreso/notas/cuestionarios, dispositivos, bandeja, colas/eventos de correo, perfiles privados, fotos y comunidad. No lee el contenido íntimo al borrar: solicita solo nombres de documentos. Conserva niveles, catálogo, configuración, auditorías y marcas mínimas para impedir que sesiones antiguas recreen datos. Los permisos se vuelven a comprobar durante la operación, incluida una promoción posterior a la vista previa.

El procesamiento es paginado y reanudable desde el módulo; el cron también avanza trabajos confirmados cada diez minutos. Si Auth rechaza la eliminación, no borra los documentos de la familia y deja el proceso para reintento. `ADMIN_ACCOUNTS_ENABLED=true` habilita este servicio independientemente de `SEND_ENABLED=false`: no activa el correo. Se mantiene Firebase Spark, sin Functions ni Storage.


### Felicitaciones de aniversario

El aniversario activa una felicitación por familia remitente y año. El Worker valida la cuenta verificada, la participación de ambas familias, la fecha en la zona de la destinataria y una clave única para evitar duplicados entre teléfonos. Guarda en un único lote el recuerdo privado y el mensaje de la bandeja. Recuerdos → Recuerdos de nuestros aniversarios permite consultarlas por año. El panel de administración no tiene acceso a estos textos. Los borrados de cuenta eliminan también mensajes enviados, recibidos y sus copias en bandejas. No se emiten correos por aniversario.

La foto familiar es obligatoria para nuevos registros y se guarda en la misma transacción que el perfil. Puede tomarse con la cámara o seleccionarse de la galería. No se publica sin participar en Comunidad. Los perfiles anteriores conservan acceso para completar su foto.

## Desactivación recuperable y eliminación total

Nosotros → Desactivar cuenta bloquea Firebase Authentication y oculta a la familia, conservando fotos, progreso y recuerdos en privado. `accountSuspensions/{uid}` bloquea las sesiones antiguas mediante las reglas y el servicio; un proceso pendiente se reintenta con exclusión temporal. El propietario está protegido frente a la desactivación. No se envían correos a cuentas desactivadas ni desde administradores desactivados.

El propietario encuentra las cuentas en **Cuentas y reinicio → Desactivadas** y puede restablecerlas con confirmación e inicio de sesión reciente. La familia vuelve a entrar con su cuenta; Comunidad permanece privada hasta que la active otra vez. Una cuenta desactivada directamente en Firebase sin un registro de desactivación no se ofrece como recuperable desde este flujo.

El borrado total desde Admin conserva su confirmación y auditoría, elimina Auth y todos los datos/fotos asociados, incluido el registro de desactivación, y no puede restablecerse. El reinicio sigue protegiendo propietario y administradores. La cuenta de servicio usa un rol personalizado independiente `entreDosAccountState` con `firebaseauth.users.update`; el rol de eliminación conserva únicamente `firebaseauth.users.delete`. No se modifican cuentas reales durante las pruebas.

Celebraciones permite elegir Todas, Cumpleaños o Aniversario y un período de 30 días o 365 días. Las fechas de nacimiento deben estar guardadas en Nosotros, incluyendo las de hijos e hijas. Solo se muestran eventos de familias activas cargadas en el panel.
