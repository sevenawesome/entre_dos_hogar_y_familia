# Correos y avisos en TestFlight — 23 de noviembre de 2026

Los correos se envían desde el servicio existente; no se activan en App Store Connect. La dirección de la membresía de Apple no crea una cuenta en la app. La recuperación solo puede enviar un enlace para una cuenta registrada, manteniendo una respuesta que no revela si el correo existe.

## Cambios

- Nosotros → Avisos muestra el permiso de esta instalación e incluye «Activar y probar avisos»: pide permiso y programa una prueba local para cinco segundos después. Los ajustes de Expo Go no se transfieren a TestFlight. Los permisos provisionales de iOS también se aceptan.
- Los recordatorios locales de retos, cumpleaños y aniversarios siguen funcionando sin el servidor abierto. El toque conserva el destino del reto o de la sección correspondiente.
- Los avisos administrativos individuales y colectivos nuevos se guardan con `pushState=pending`. Un proceso independiente, cada minuto, entrega hasta dos mensajes por ejecución, con un máximo de cinco teléfonos por cuenta. La cola evita duplicados concurrentes y expira mensajes de más de un día. No reenvía a ciegas después de una respuesta de red incierta.
- Los avisos remotos muestran el título y texto que escribió Administración. Al tocarlos se abre ese mensaje en una ventana de la bandeja, incluyendo mensajes que ya no estén entre los 30 más recientes. Solo se acorta el texto del aviso si el paquete completo superaría el límite de tamaño; dentro de la app se conserva completo. Los adjuntos se ven dentro de la app. La privacidad explica que el título y texto pueden aparecer en la pantalla bloqueada. Se comprueban bajas, suspensiones, controles y vencimiento del registro. Los recibos distinguen aceptación del proveedor de entrega al dispositivo; ni un recibo correcto garantiza que el iPhone lo haya mostrado.
- El registro del teléfono se renueva al abrir la app, caduca a los 30 días y se revoca al cerrar sesión. Un token solo pertenece a una cuenta actual. El borrado definitivo elimina también estos registros. Los mensajes antiguos y las felicitaciones de Comunidad conservan el aviso local al sincronizar; no se convierten en envíos remotos retrospectivos.
- La privacidad explica el uso de datos con lenguaje cotidiano, sin nombres de proveedores. Los límites de recuperación muestran una espera real, en lugar de afirmar que se envió un correo. El servicio gratuito de recuperación sigue como alternativa si el correo personalizado está apagado, sin cuota o temporalmente indisponible.

## Credencial configurada

La clave APNs `TR99B3T78J` del equipo Apple `6DRBD9Z2VS` quedó cargada y vinculada en Expo a `com.sevenawesome.entredos`. Se comprobó la asignación en una consulta independiente después de guardarla. `PUSH_ENABLED=true` está desplegado y el estado público confirma `pushEnabled=true`. La clave privada se conserva únicamente en las ubicaciones locales excluidas de Git y en las credenciales de Expo. No se incluye su contenido en archivos de evidencia ni en los registros.

La clave App Store Connect `TBW5U3MM53` sirve para subir compilaciones y no es una clave APNs. No se deben intercambiar. Android requiere su credencial FCM propia y `PUSH_ANDROID_ENABLED=true`; permanece desactivado mientras no esté configurado.

La app ya incluye el módulo y el permiso nativo de notificaciones en TestFlight 1.0.0 (5). Esta corrección de JavaScript conserva el runtime `b5f693e949a92c6f7c4ea3b2df2ac2e538f7e56c`; no requiere recompilar para ese build.

## Validación

- TypeScript y lint correctos; 136 pruebas de app/dominio, 84 del servicio y 65 de reglas/Auth con emuladores (estas últimas de la revisión anterior, sin cambios en reglas).
- Se probaron propiedad del registro del teléfono, autenticación, baja y suspensión, concurrencia, conservación del cuerpo y adjuntos, revocación y limpieza, errores/recibos del proveedor y el peor caso dentro de las 50 solicitudes externas de Workers Free. No se enviaron correos ni avisos reales durante estas pruebas.
- Revisión visual de Nosotros → Avisos y Privacidad en 390 × 844, sin errores de página ni desbordamiento horizontal.
- Reglas e índices desplegados. El correo y los avisos remotos iOS están activos. Se confirmó que el endpoint de registro rechaza solicitudes sin sesión (401). El registro del iPhone y la entrega física quedan pendientes de abrir la actualización, activar el permiso y realizar la prueba en ese teléfono. La aceptación de la clave en Expo no demuestra por sí sola la recepción en APNs ni en el iPhone.

Para comprobarlo en el teléfono: abrir la app instalada desde TestFlight, dejar descargar la actualización y volver a abrirla. Iniciar sesión con una cuenta registrada, entrar en Nosotros → Avisos y pulsar «Activar y probar avisos». Permitir los avisos y salir a la pantalla de inicio. Revisar también Ajustes → Notificaciones y los modos de Concentración del iPhone. Después de habilitar APNs, probar un aviso administrativo nuevo a una sola cuenta antes de un envío colectivo.

## Publicación comprobada

TestFlight 5 recibe el grupo `1ca2bed8-edc9-4d15-adbd-3def9d6e35cf` por el canal production, con el runtime compatible. Se comprobó el manifiesto seleccionado por el canal, la descarga del paquete y su suma SHA-256. Evidencia: [TESTFLIGHT_UPDATE.json](TESTFLIGHT_UPDATE.json).

Expo Go conservó su QR de rama y recibió el grupo `f183f12f-6bd1-4267-b2d3-51861553d68d`, runtime `exposdk:58.0.0`. Se comprobaron ambos paquetes y las siete imágenes de demostración. El código de ambas publicaciones iniciales corresponde a `83d32a11548bd5d81c7ee404932d8b00fc50d99f`. La activación posterior de APNs solo cambió las credenciales y el servicio; no requirió otra actualización de JavaScript ni otra compilación. El usuario confirmó después que recibe avisos locales y administrativos.

## Texto del aviso y publicación en Comunidad

A petición del usuario, los avisos administrativos nuevos incluyen su título y cuerpo en vez de un aviso genérico. Se probaron mensajes cortos completos, Unicode extenso y caracteres escapados para mantener cada paquete por debajo de 3800 bytes sin modificar el texto guardado. No se enviaron mensajes de prueba reales. La ventana del mensaje abre automáticamente desde el identificador del aviso y sigue los cambios y el borrado del documento bajo los permisos de la cuenta receptora.

La consulta de diagnóstico de solo lectura encontró un perfil con participación activada, normas aceptadas y estado pendiente, sin perfiles aprobados. No era un fallo de listado. La pantalla ahora muestra a la propia cuenta una tarjeta privada con su estado y un acceso directo a «Administración → Moderar Comunidad» para quien tenga ese permiso. No se aprobó ni publicó automáticamente ningún perfil. El propietario debe abrir la vista previa, revisar nombres y fotos, marcar la revisión y aprobar la publicación. Los cambios se verificaron en 390 × 844, sin errores ni desbordamiento.
