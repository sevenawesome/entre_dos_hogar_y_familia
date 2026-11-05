# Pendientes para terminar ENTRE DOS

## Firebase Spark

La configuración pública recibida está en `.env` local, excluido de Git. El propietario mostró Authentication por correo/contraseña habilitado y Firestore `(default)` creado. La versión actual usa Spark: no se necesita activar Blaze, Storage ni Cloud Functions.

Falta iniciar sesión localmente y desplegar las reglas e índices:

```powershell
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore --project entre-dos-db
```

Luego registra tu cuenta y familia en la app, copia el UID de Authentication y crea con permisos del propietario `roles/UID` con `role: owner` (string). Desde Admin puedes cargar el nivel 1 original, el catálogo de bodas y la configuración inicial. El procedimiento está en [ADMINISTRACION.md](ADMINISTRACION.md). No envíes contraseñas, archivos de cuenta de servicio ni claves privadas.

## Expo y teléfonos

El ID recibido es `f9af2154-9d1b-49d6-bae8-588d83ce3ad7`. Falta iniciar sesión EAS y confirmar el propietario/slug del proyecto existente. El identificador `com.sevenawesome.entredos` es provisional y debe confirmarse antes de publicar.

Necesitamos Android e iPhone para probar notificaciones locales, selector/compresión de fotos, sincronización, permisos y eliminación. Las notificaciones locales no requieren credenciales de envío remoto FCM/APNs.

## Límites acordados de la versión gratuita

Los avisos diarios son generales y se programan por teléfono; los cambios de otro dispositivo y las pausas administrativas se aplican al sincronizar. Cumpleaños/aniversarios se programan para los próximos dos años y se renuevan al usar la app. Los mensajes del administrador llegan a una bandeja al abrir/sincronizar; no hay push remoto inmediato con la app cerrada. Firebase Spark tiene cuotas, supervisadas desde la consola.

El progreso admite un reto cada 24 horas validado con la hora del servidor. La familia admite hasta diez hijos para mantener la validación dentro del presupuesto de ejecución de las reglas. Las fotos son miniaturas pequeñas en Firestore; no se guarda el original ni se usa Storage.

## Publicación

Faltan la identidad legal del responsable, país, correo de soporte/privacidad, política pública y página para solicitar eliminación; confirmar el contenido y modelo gratuito de la primera versión. Se necesitan Google Play Console y Apple Developer, correos de probadores y cuentas de firma. Las tiendas tienen requisitos/costos separados de Firebase Spark.

No se han enviado builds a las tiendas, creado administradores reales ni desplegado estas reglas en el proyecto del propietario. La comunidad y el panel de demostración muestran datos ficticios y no contactan a nadie.
