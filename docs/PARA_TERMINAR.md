# Pendientes para terminar ENTRE DOS

## Firebase Spark

La configuración pública recibida está en `.env` local, excluido de Git. El propietario mostró Authentication por correo/contraseña habilitado y Firestore `(default)` creado. La versión actual usa Spark: no se necesita activar Blaze, Storage ni Cloud Functions.

Las reglas e índices ya fueron desplegados por el propietario y la primera cuenta propietaria ya fue asignada y verificada en Firestore, con auditoría. Estos comandos quedan como referencia para futuros despliegues:

```powershell
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore --project entre-dos-db
```

La cuenta del propietario ya está registrada con su familia y tiene `roles/UID.role = owner`. La app recibe ese permiso por suscripción. El nivel 1 original (30 retos/seis preguntas), catálogo de bodas y configuración inicial ya están cargados y verificados, con auditoría. Desde Admin puedes gestionar la configuración y publicar los próximos niveles. El procedimiento está en [ADMINISTRACION.md](ADMINISTRACION.md). No envíes contraseñas, archivos de cuenta de servicio ni claves privadas.

## Expo y teléfonos

El ID recibido es `f9af2154-9d1b-49d6-bae8-588d83ce3ad7`. La sesión de Expo CLI ya está iniciada y el propietario abrió la app en Expo Go para iPhone. Falta confirmar propietario/slug del proyecto existente en Expo Build. El identificador `com.sevenawesome.entredos` es provisional y debe confirmarse antes de publicar.

Necesitamos Android e iPhone para probar notificaciones locales, selector/compresión de fotos, sincronización, permisos y eliminación. Las notificaciones locales no requieren credenciales de envío remoto FCM/APNs.

## Límites acordados de la versión gratuita

Los avisos diarios muestran el último reto sincronizado y se programan por teléfono; los cambios de otro dispositivo y las pausas administrativas se aplican al sincronizar. Cumpleaños/aniversarios se programan para los próximos dos años y se renuevan al usar la app. Los mensajes del administrador llegan a una bandeja al abrir/sincronizar; no hay push remoto inmediato con la app cerrada. Firebase Spark tiene cuotas, supervisadas desde la consola.

La fecha de matrimonio es obligatoria al registrar o editar una familia. Los perfiles anteriores sin fecha deben completarla para continuar, conservando sus datos y progreso. Los cumpleaños siguen siendo opcionales. El botón inicial abre el primer reto de inmediato. Cada reto sigue pendiente hasta completarlo y solo entonces empieza la espera de 24 horas para el siguiente, validada con la hora del servidor. No se saltan retos aunque pasen varios días. La familia admite hasta diez hijos para mantener la validación dentro del presupuesto de ejecución de las reglas. Las fotos son miniaturas pequeñas en Firestore; no se guarda el original ni se usa Storage.

## Publicación

Faltan la identidad legal del responsable, país, correo de soporte/privacidad, política pública y página para solicitar eliminación; confirmar el contenido y modelo gratuito de la primera versión. Se necesitan Google Play Console y Apple Developer, correos de probadores y cuentas de firma. Las tiendas tienen requisitos/costos separados de Firebase Spark.

No se han enviado builds a las tiendas. Las reglas de Firestore están desplegadas y el primer propietario real está habilitado y auditado. La comunidad y el panel de demostración muestran datos ficticios y no contactan a nadie.

Fotos: familiar ampliable y fotos individuales privadas de ambos integrantes e hijos. La familia puede publicar por persona nombre/foto/día/mes de cumpleaños, nunca edad o año. Verificación gratuita del correo mediante Firebase Authentication (límite Spark de 1.000 mensajes diarios); se solicita al registrarse y puede repetirse desde Nosotros. No bloquea los retos.

Preparados el centro de configuración y los permisos por administrador. Las cuentas de Resend/Cloudflare, el dominio verificado y los tres secretos ya están listos; el Worker está publicado con envíos desactivados. Se comprobaron la identidad y los roles de la cuenta de servicio de Google, su autenticación y las consultas de Firestore/Authentication. Faltan la verificación del correo y consentimiento de la familia de prueba, la activación controlada y la comprobación real de recepción/baja. `sevenawesome.srl@gmail.com` es el contacto y la dirección inicial para respuestas; el remitente será `avisos@correo.sevenawesome.com`. Procedimiento: [CORREOS_Y_PERMISOS.md](CORREOS_Y_PERMISOS.md).
