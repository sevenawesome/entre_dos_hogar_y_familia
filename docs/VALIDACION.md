# Validación de ENTRE DOS · Firebase Spark

Verificado el 6 de noviembre de 2026. Las pruebas automatizadas usan proyectos demo locales y transporte de correo simulado; la comprobación remota es de lectura. La comprobación remota confirmó Auth y las tres consultas indexadas de eventos/trabajos/cola, con el nuevo índice listo. El correo propietario ya figura verificado. El despliegue mantiene el envío de correo real apagado. No se modificaron roles reales ni se enviaron mensajes a familias.

## Comprobaciones actuales

- `npm run check`: TypeScript y lint sin errores; 105 pruebas de dominio/regresión aprobadas. Incluyen catálogo original de 30 retos, secuencia/niveles, recordatorios, fechas, fotos/privacidad y siete permisos administrativos. Se retiraron las pruebas del resumen diario de correo junto con esa funcionalidad; se sustituyeron por eventos transaccionales.
- Firestore/Auth Emulator: 51 pruebas aprobadas (48 de reglas y tres de acceso). Cubren familia/resumen atómicos, matrimonio obligatorio, espera de 24 horas, cuestionario, permisos efectivos, aislamiento de notas, comunidad, fotos, bandeja y eliminación. Nuevos casos: control administrativo de correo, imposibilidad de anular una baja, separación de permisos de ambos canales, cola sin copia en bandeja, evento de bienvenida ligado al primer registro, evento único ligado al cierre y concesión/revocación de los siete permisos.
- Worker: 19 pruebas aprobadas, sin red hacia Resend. Cubren verificación pendiente sin cuota, bienvenida única con y sin documento de recepción, nivel solo tras el cuestionario, lecturas con máscara sin respuestas, ausencia de resúmenes diarios, pausas independientes, permisos vigentes, bajas firmadas, cuotas concurrentes, reintentos idénticos dentro de 23 horas, direcciones de Auth, remitente verificado y estado público sin secretos.
- Exportación de producción Android, iOS y web aprobada con Expo SDK 58. Comprueba empaquetado; no equivale a probar binarios nativos ni genera firma/publicación en las tiendas.
- Vista móvil web 390 × 844 con familias ficticias: ocho secciones administrativas, siete permisos en español, búsqueda y revisión de correo, ajustes con dos plantillas y categorías limitadas, notificaciones independientes, Fechas, Niveles y Configuración. Nosotros conserva seguridad y avisos del teléfono sin controles de correo. Se corrigió un espacio JSX fuera de Text detectado en esta revisión. Captura: [panel organizado](preview-admin-organizado.jpg).

## Servicios externos

Firestore tiene desplegadas las reglas actuales y el índice `mailEvents(state,nextAttemptAt)`. El Worker `entre-dos-correo` está actualizado, con cron cada diez minutos y `SEND_ENABLED=false`. Sus tres secretos siguen solo en Cloudflare. La cuenta real propietaria conserva el rol `owner`; no se alteró su documento.

El dominio `correo.sevenawesome.com` está verificado en Resend; DNS en GoDaddy. La cuenta dedicada de Google se comprobó con solo Usuario de Cloud Datastore y Visualizador de Firebase Authentication. El servicio usa IAM, mientras que los clientes usan las reglas. No se activó Blaze, Storage ni Cloud Functions. Procedimiento y política: [correo y permisos](CORREOS_Y_PERMISOS.md).

## Pendiente antes de publicar

Autorizar una prueba controlada de recepción/baja antes de activar el Worker. El correo propietario ya está verificado; las nuevas familias confirman su dirección desde Nosotros → Su correo de contacto. No se ha probado entrega real, spam, rebotes ni lectura; accepted solo indica aceptación del proveedor. Comprobar la app en iPhone y Android físicos, con dos dispositivos, permisos y notificaciones. La automatización local no sustituye estas pruebas. Las cuentas de desarrollador y requisitos de tiendas son independientes de Firebase Spark.
