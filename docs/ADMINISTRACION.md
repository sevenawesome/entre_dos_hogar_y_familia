# Administración de ENTRE DOS

La pestaña Admin aparece para cuentas con rol `owner` o `admin`. Ahora contiene Familias, Fechas, Seguimiento, Notificaciones, Correos, Administradores, Niveles y Configuración. Solo muestra secciones permitidas para esa cuenta. Consulta la [guía completa de permisos y correo](CORREOS_Y_PERMISOS.md).

## Administradores

En Admin → Administradores busca el correo o UID de una cuenta que ya registró su familia. Activa «Esta cuenta es administradora», elige sus permisos, confirma y guarda. Para retirarle acceso, apaga esa opción y guarda. El permiso pertenece a la cuenta compartida: ambos integrantes lo usan.

Los siete permisos están en español: consultar familias, editar perfiles, enviar notificaciones, enviar correos/gestionar destinatarios, gestionar niveles, configurar la app/correo y gestionar otros administradores. El propietario conserva todos. Nadie puede modificar su propio rol ni el del propietario o conceder permisos superiores a los que tiene. Las modificaciones llevan auditoría y se aplican en reglas de Firebase y Worker, además de la interfaz. Una revocación no borra copias vistas anteriormente.

## Familias, fechas y seguimiento

Familias busca exactamente por correo registrado o UID y muestra un resumen del progreso. El permiso de edición permite cambiar nombres y fechas o pausar recordatorios de una familia; el matrimonio es obligatorio y la zona horaria original se conserva. Los cumpleaños son opcionales. No se muestran notas íntimas, cuestionarios ni fotos individuales privadas.

Fechas reúne cumpleaños y aniversarios de los próximos treinta días. Seguimiento muestra quienes llevan siete días o más sin completar desde su último avance o registro; no es una penalización ni una clasificación pública. Las cifras y fechas corresponden a las familias cargadas, por páginas de veinte, para cuidar Firebase Spark.

## Dos canales separados

Notificaciones solo guarda un mensaje en la bandeja privada. La familia lo recibe al abrir o sincronizar la app y puede mostrarse un aviso local; no garantiza push inmediato con la app cerrada. No consume correos.

Correos permite buscar destinatario, gestionar administrativamente su recepción, redactar, revisar y confirmar un envío. Tiene permiso independiente y muestra reservas de cuota en UTC. Ajustes de correo requiere configurar la aplicación: remitente, respuesta, categorías, límites y dos plantillas. No hay correos diarios; solo bienvenida tras verificar, nivel conseguido y mensajes manuales. Las bajas firmadas desde los correos se respetan. El envío real sigue desactivado.

## Niveles y configuración

Niveles permite preparar/validar un documento JSON, guardar borradores y publicar contenido. Un nivel publicado conserva su recorrido para proteger historiales. Puede cargar el catálogo inicial de bodas si no existe; no lo sobrescribe.

Configuración reúne mensajes para familias, soporte, aviso de nuevo nivel, texto al terminar todo y habilitación global de notificaciones del teléfono. Incluye vistas de ejemplo del nivel actual, final sin nuevos capítulos y anuncio de nivel nuevo. Los formularios con versión detectan cambios concurrentes y ofrecen recarga. Las claves de proveedores permanecen fuera de la app.

## Comunidad

Participar es opcional. La foto familiar aparece circular, de 72 puntos, y se amplía al tocarla. La familia elige compartir aniversario y contadores; autoriza por separado cumpleaños individuales, con nombre, miniatura y día/mes. Nunca se publican edad, año de nacimiento, correo, notas ni cuestionarios. No se usa Firebase Storage.
