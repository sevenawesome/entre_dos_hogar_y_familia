# Pendientes para terminar Amor que permanece

## Firebase Spark

La configuración pública recibida está en `.env` local, excluido de Git. El propietario mostró Authentication por correo/contraseña habilitado y Firestore `(default)` creado. La versión actual usa Spark: no se necesita activar Blaze, Storage ni Cloud Functions.

Las reglas e índices ya fueron desplegados por el propietario y la primera cuenta propietaria ya fue asignada y verificada en Firestore, con auditoría. Estos comandos quedan como referencia para futuros despliegues:

```powershell
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore --project entre-dos-db
```

La cuenta del propietario ya está registrada con su familia y tiene `roles/UID.role = owner`. La app recibe ese permiso por suscripción. El nivel 1 original (30 retos/seis preguntas), catálogo de bodas y configuración inicial ya están cargados y verificados, con auditoría. Desde Admin puedes gestionar la configuración y publicar los próximos niveles. El procedimiento está en [ADMINISTRACION.md](ADMINISTRACION.md). No envíes contraseñas, archivos de cuenta de servicio ni claves privadas.

## Expo y teléfonos

El ID recibido es `f9af2154-9d1b-49d6-bae8-588d83ce3ad7`. La sesión de Expo CLI ya está iniciada y el propietario abrió la app en Expo Go para iPhone. Propietario/slug confirmados y alineados: @sevenawesomes-team/entre-dos-by-departamento-de-hogar-y-familia. El identificador `com.sevenawesome.entredos` es provisional y debe confirmarse antes de publicar.

Necesitamos Android e iPhone para probar notificaciones locales, selector/compresión de fotos, sincronización, permisos y eliminación. Las notificaciones locales no requieren credenciales de envío remoto FCM/APNs.

## Prueba publicada sin servidor local

El 16 de noviembre se publicó la rama `expo-go-preview` para iOS y Android, con runtime `exposdk:58.0.0`. El propietario confirmó que abrió en su iPhone desde Expo Go. No requiere Metro ni la computadora encendida; sí Internet. El QR está en [expo-go-preview.png](expo-go-preview.png) y el enlace, identificadores y comando para futuras actualizaciones están en [EXPO_GO_PREVIEW.json](EXPO_GO_PREVIEW.json).

El entorno Expo `preview` ya contiene siete variables públicas de Firebase/EAS y `EXPO_UPDATE_TARGET=expo-go`. No se copiaron claves privadas ni secretos de correo. Para builds propios se utiliza fingerprint; el perfil de build `preview` fuerza `EXPO_UPDATE_TARGET=native`. El entorno `production` quedó configurado el 20 de noviembre con los siete identificadores públicos y `EXPO_UPDATE_TARGET=native`; su perfil usa el canal `production`. No se publicaron builds en tiendas. Los correos se activaron posteriormente el 16 de noviembre.

Expo Go requiere SDK compatible y una cuenta que sea propietaria o miembro de la organización dueña del proyecto. Para probadores externos, añadirlos con el acceso mínimo necesario o utilizar posteriormente TestFlight/Google Play. La comprobación en Expo Go no sustituye las pruebas de un binario propio.

## Límites acordados de la versión gratuita

Los avisos diarios muestran el último reto sincronizado y se programan por teléfono; los cambios de otro dispositivo y las pausas administrativas se aplican al sincronizar. Cumpleaños/aniversarios se programan para los próximos dos años y se renuevan al usar la app. Los mensajes del administrador llegan a una bandeja al abrir/sincronizar; no hay push remoto inmediato con la app cerrada. Firebase Spark tiene cuotas, supervisadas desde la consola.

La fecha de matrimonio es obligatoria al registrar o editar una familia. Los perfiles anteriores sin fecha deben completarla para continuar, conservando sus datos y progreso. Los cumpleaños siguen siendo opcionales. El botón inicial abre el primer reto de inmediato. Cada reto sigue pendiente hasta completarlo y solo entonces empieza la espera de 24 horas para el siguiente, validada con la hora del servidor. No se saltan retos aunque pasen varios días. La familia admite hasta diez hijos para mantener la validación dentro del presupuesto de ejecución de las reglas. Las fotos son miniaturas pequeñas en Firestore; no se guarda el original ni se usa Storage.

## Publicación

El titular confirmó el nombre legal Salim Bencosme, la membresía Apple Developer activa y el acceso a App Store Connect. Falta cotejar el país, confirmar el correo público de soporte/privacidad y publicar la política y la página para solicitar eliminación. Google Play todavía necesita completar su inicialización. El 22 de noviembre se resolvió la firma manual, terminó correctamente el build iOS 1.0.0 (4) y se subió a App Store Connect con clave API. Apple lo procesó como VALID y READY_FOR_BETA_TESTING. El grupo Pruebas internas contiene el build y todavía no tiene probadores: falta que el titular añada su usuario e instale la app desde TestFlight para las pruebas físicas. Los bloqueos de App Review público siguen pendientes. La ficha tiene Apple ID 6838059210. Estado y procedimiento en [APPLE_PUBLICACION.md](APPLE_PUBLICACION.md), evidencia en [IOS_BUILD.json](IOS_BUILD.json). Las tiendas tienen requisitos/costos separados de Firebase Spark.

El primer build iOS ya está en App Store Connect para pruebas internas de TestFlight; no se envió a revisión pública ni se lanzó en la tienda. Las reglas de Firestore están desplegadas y el primer propietario real está habilitado y auditado. El acceso ofrece una presentación con imágenes ficticias; explorarla no crea una sesión ni datos de demostración.

Fotos: familiar ampliable y fotos individuales privadas de ambos integrantes e hijos. La familia puede publicar por persona nombre/foto/día/mes de cumpleaños, nunca edad o año. Verificación gratuita del correo mediante Firebase Authentication (límite Spark de 1.000 mensajes diarios); se solicita al registrarse y puede repetirse desde Nosotros. No bloquea los retos.

Preparados el centro de configuración y los permisos por administrador. Las cuentas de Resend/Cloudflare, el dominio verificado y los tres secretos ya están listos; el Worker está publicado con envíos activos desde el 16 de noviembre. Se comprobaron la identidad y los roles de la cuenta de servicio de Google, su autenticación y las consultas de Firestore/Authentication. El correo propietario ya está verificado y las consultas indexadas de eventos, trabajos y cola están comprobadas. La cola vacía se revisó y se activó el servicio. Resend aceptó una recuperación real del propietario; faltan su confirmación de recepción y la prueba de baja. `sevenawesome.srl@gmail.com` es el contacto y la dirección inicial para respuestas; el remitente será `avisos@correo.sevenawesome.com`. Procedimiento: [CORREOS_Y_PERMISOS.md](CORREOS_Y_PERMISOS.md).

Actualización de aniversarios y registro: los nuevos registros requieren una foto familiar tomada con cámara o elegida de la galería; se guarda de forma privada y solo se comparte al participar en Comunidad. Las felicitaciones están limitadas a una por familia remitente y aniversario y quedan archivadas en Recuerdos. Se notifican al recibirlas/sincronizar; no son push inmediato con la app cerrada. La programación local del aniversario incluye los años que celebran y funciona también después de terminar los niveles. Falta probar cámara y entrega real de avisos en iPhone/Android; los permisos nativos personalizados de cámara requieren una nueva compilación de la app para tiendas/preview.

Actualización del 11 de noviembre: recordatorios de retos abren el reto pendiente usando el progreso sincronizado; si solo queda el cuestionario o se terminó el recorrido, abren Camino. Revisiones de correo/notificación y lectura de bandeja usan ventanas emergentes. Adjuntos de hasta tres archivos y 250 KB totales, guardados en Firestore sin Storage. Celebraciones incorpora filtros de cumpleaños/aniversarios y 30/365 días. La desactivación familiar conserva datos y fotos para restablecimiento por el propietario; Admin mantiene el borrado permanente protegido. Falta probar en teléfonos reales el toque de una notificación con la app cerrada y la selección/apertura de adjuntos. Ese 11 de noviembre el correo permanecía apagado; el propietario autorizó su activación el 16 de noviembre.

Recordatorios de disponibilidad: la pantalla del reto muestra los minutos restantes redondeados hacia arriba y la fecha/hora local. El reloj se actualiza al volver a la app y al alcanzar la fecha de desbloqueo. Con avisos habilitados, se programa una notificación local única al vencer las 24 horas del último reto completado, independiente del horario del recordatorio diario. Al tocarla, se abre el reto pendiente con el progreso sincronizado. Pausar o cerrar sesión cancela estos avisos. El otro teléfono debe sincronizar la finalización para renovar su programación. El sistema operativo puede retrasar la presentación del aviso según sus ajustes. Falta comprobar su entrega en teléfonos reales; no se han enviado avisos reales de prueba.

Actualización del 17 de noviembre: «Explorar demostración» es una galería de seis imágenes locales de ejemplo. Recuperar y cambiar contraseña tienen rutas independientes. Se publicó la actualización en Expo para iOS/Android y se comprobó la descarga de ambos paquetes y de las seis imágenes. El QR de EXPO_GO_PREVIEW.json apunta a la última versión de la rama de prueba; la apertura de esta actualización concreta en el teléfono queda pendiente del propietario.

Última actualización: 17 de noviembre, grupo 07c2857e-ae3f-464f-8adb-bff02e99fa77. El recorrido ahora tiene **siete** imágenes con fotos ficticias y cumpleaños individuales. Nosotros y los envíos colectivos ya están publicados y verificados para ambos sistemas. Reabrir desde el QR para confirmar esta versión en el teléfono.

Actualización del 18 de noviembre: apartados y accesos directos ya publicados en Expo Go, grupo 6ddb9dd1-1ba2-4e2d-a556-310d14de1aa1. Tipos, lint y 132 pruebas correctos; revisión móvil aislada completada. Reabrir desde el QR para confirmar la versión nueva en iPhone. La organización se explica en Información → Guía y en [NAVEGACION.md](NAVEGACION.md).


Actualización del 22 de noviembre — borrado definitivo y moderación: añadidos el borrado propio con contraseña y limpieza reintentable, transferencia de propietario antes de su borrado expreso, revisión previa de perfiles/fotos, normas aceptadas, reportes, bloqueos bidireccionales y panel con permiso independiente. Se conserva la desactivación recuperable y la protección del propietario en reinicios. El recurso web de solicitud de borrado funciona sin reinstalar la app. Procedimiento y límites: [MODERACION_Y_BORRADO.md](MODERACION_Y_BORRADO.md). Las pruebas usan datos ficticios; falta verificar los flujos y cachés nativos entre dos teléfonos antes de App Review.

Verificación del 23 de noviembre: iOS 1.0.0 (5) ya está procesado por Apple y habilitado en el grupo interno de TestFlight. La actualización de Expo Go también está publicada y comprobada para ambos sistemas con el mismo QR. Borrado definitivo y moderación están desplegados; quedan las pruebas físicas con cuentas ficticias y la ficha pública antes de App Review. Estado: [IOS_BUILD.json](IOS_BUILD.json).
