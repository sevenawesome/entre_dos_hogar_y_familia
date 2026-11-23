# Correos y avisos en TestFlight — 23 de noviembre de 2026

Los correos se envían desde el servicio existente; no se activan en App Store Connect. La dirección de la membresía de Apple no crea una cuenta en la app. La recuperación solo puede enviar un enlace para una cuenta registrada, manteniendo una respuesta que no revela si el correo existe.

## Cambios

- Nosotros → Avisos muestra el permiso de esta instalación e incluye «Activar y probar avisos»: pide permiso y programa una prueba local para cinco segundos después. Los ajustes de Expo Go no se transfieren a TestFlight. Los permisos provisionales de iOS también se aceptan.
- Los recordatorios locales de retos, cumpleaños y aniversarios siguen funcionando sin el servidor abierto. El toque conserva el destino del reto o de la sección correspondiente.
- Los avisos administrativos individuales y colectivos nuevos se guardan con `pushState=pending`. Un proceso independiente, cada minuto, entrega hasta dos mensajes por ejecución, con un máximo de cinco teléfonos por cuenta. La cola evita duplicados concurrentes y expira mensajes de más de un día. No reenvía a ciegas después de una respuesta de red incierta.
- Los avisos remotos muestran texto genérico y abren la bandeja; el cuerpo privado y los adjuntos permanecen en la cuenta. Se comprueban bajas, suspensiones, controles y vencimiento del registro. Los recibos distinguen aceptación del proveedor de entrega al dispositivo; ni un recibo correcto garantiza que el iPhone lo haya mostrado.
- El registro del teléfono se renueva al abrir la app, caduca a los 30 días y se revoca al cerrar sesión. Un token solo pertenece a una cuenta actual. El borrado definitivo elimina también estos registros. Los mensajes antiguos y las felicitaciones de Comunidad conservan el aviso local al sincronizar; no se convierten en envíos remotos retrospectivos.
- La privacidad explica el uso de datos con lenguaje cotidiano, sin nombres de proveedores. Los límites de recuperación muestran una espera real, en lugar de afirmar que se envió un correo. El servicio gratuito de recuperación sigue como alternativa si el correo personalizado está apagado, sin cuota o temporalmente indisponible.

## Credencial pendiente

`PUSH_ENABLED=false` hasta instalar la clave APNs del equipo Apple `6DRBD9Z2VS` en las credenciales iOS de Expo. La clave App Store Connect `TBW5U3MM53` sirve para subir compilaciones y no es una clave APNs. No se deben intercambiar.

En Apple Developer → Certificates, Identifiers & Profiles → Keys, crear una clave de Apple Push Notifications (APNs), descargarla y cargarla mediante `npx eas-cli@latest credentials --platform ios` → production → Push Notifications → usar una clave existente. No imprimir ni versionar la clave. Después habilitar `PUSH_ENABLED=true` y desplegar el Worker. Android requiere su credencial FCM propia y `PUSH_ANDROID_ENABLED=true`; permanece desactivado mientras no esté configurado.

La app ya incluye el módulo y el permiso nativo de notificaciones en TestFlight 1.0.0 (5). Esta corrección de JavaScript conserva el runtime `b5f693e949a92c6f7c4ea3b2df2ac2e538f7e56c`; no requiere recompilar para ese build.

## Validación

- TypeScript y lint correctos; 136 pruebas de app/dominio, 83 del servicio y 65 de reglas/Auth con emuladores.
- Se probaron propiedad del registro del teléfono, autenticación, baja y suspensión, concurrencia, conservación del cuerpo y adjuntos, revocación y limpieza, errores/recibos del proveedor y el peor caso dentro de las 50 solicitudes externas de Workers Free. No se enviaron correos ni avisos reales durante estas pruebas.
- Revisión visual de Nosotros → Avisos y Privacidad en 390 × 844, sin errores de página ni desbordamiento horizontal.
- Reglas e índices desplegados. El correo continúa activo. El registro remoto del teléfono y la entrega física quedan pendientes de configurar APNs y abrir la actualización en el iPhone.

Para comprobarlo en el teléfono: abrir la app instalada desde TestFlight, dejar descargar la actualización y volver a abrirla. Iniciar sesión con una cuenta registrada, entrar en Nosotros → Avisos y pulsar «Activar y probar avisos». Permitir los avisos y salir a la pantalla de inicio. Revisar también Ajustes → Notificaciones y los modos de Concentración del iPhone. Después de habilitar APNs, probar un aviso administrativo nuevo a una sola cuenta antes de un envío colectivo.

## Publicación comprobada

TestFlight 5 recibe el grupo `1ca2bed8-edc9-4d15-adbd-3def9d6e35cf` por el canal production, con el runtime compatible. Se comprobó el manifiesto seleccionado por el canal, la descarga del paquete y su suma SHA-256. Evidencia: [TESTFLIGHT_UPDATE.json](TESTFLIGHT_UPDATE.json).

Expo Go conserva su QR de rama y recibe el grupo `f183f12f-6bd1-4267-b2d3-51861553d68d`, runtime `exposdk:58.0.0`. Se comprobaron ambos paquetes y las siete imágenes de demostración. El código de ambas publicaciones corresponde a `83d32a11548bd5d81c7ee404932d8b00fc50d99f`. Ninguna de estas comprobaciones demuestra recepción física de un aviso remoto; sigue pendiente la clave APNs.
