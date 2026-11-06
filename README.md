# ENTRE DOS

App móvil para parejas: React Native, Expo SDK 58, TypeScript, Redux Toolkit y Firebase Spark. Identidad **ENTRE DOS · By Departamento de Hogar y Familia**. Creado por [SevenAwesome](https://www.sevenawesome.com/).

## Probar

```powershell
npm install
npm run web
```

En el acceso, elige **Explorar demostración**. La familia, foto y progreso de demostración se guardan solo en ese navegador o teléfono. La comunidad y administración muestran ejemplos ficticios; no se contacta a nadie ni se conceden permisos reales.

Para Android/iOS usa `npm start` y un development build. La vista web permite revisar pantallas; no programa avisos del teléfono.

## Qué incluye

- Una cuenta por correo/contraseña compartida por la pareja; familia con fecha de matrimonio obligatoria y hasta diez hijos; cumpleaños opcionales.
- Los 30 retos y seis preguntas reales del documento original; notas y respuestas compartidas solo dentro de la familia.
- Botón inicial destacado y único por familia. Abre el reto 1 de inmediato. Cada reto permanece pendiente hasta completarlo; el siguiente abre **24 horas después de completarlo**, también entre niveles. Firestore valida la espera con la hora del servidor y confirma progreso/resumen en una transacción. Dejar pasar días no salta retos ni permite completarlos todos de golpe. El cuestionario consigue el nivel y desbloquea su prerrequisito.
- Catálogo de niveles dinámico: primeros 30 retos, futuros 50 o cualquier cantidad de 1–200. Estados de carga, nivel actual, celebración sin sucesor y nuevo capítulo disponible.
- Años de matrimonio actuales/próximos, aro de aniversario y 60 categorías tradicionales de bodas con explicaciones y fuentes propias/documentadas.
- Cumpleaños de pareja e hijos, edades y barras de cuenta regresiva. El 29 de febrero se observa el 28 cuando el año no es bisiesto.
- Recordatorio diario local del último reto sincronizado con `expo-notifications`, configurable por teléfono; celebraciones de los próximos dos años, reprogramadas al abrir/sincronizar. Máximo 27 solicitudes con diez hijos y fechas de ambos integrantes.
- Foto familiar: selección, recorte cuadrado y miniatura JPEG de 384 × 384 con límite de unos 32 KB. Se guarda en documentos separados de Firestore, sin usar Storage ni conservar el original.
- Fotos individuales: miniaturas de 160 × 160, máximo 16.000 caracteres de URI (unos 12 KB). Privadas incluso frente a administradores hasta que la familia autorice ese cumpleaños en Comunidad. Las fotos públicas pueden ampliarse al tocar.
- Correo compartido obligatorio para la cuenta, verificación al registrarse y reenvío/comprobación en Nosotros. Firebase Spark incluye [hasta 1.000 correos de verificación al día](https://firebase.google.com/docs/auth/limits); no se implementan campañas ni acceso sin contraseña.
- Comunidad opcional: alias y foto, consentimiento separado para aniversario y contadores de retos/niveles. Permiso adicional por persona para compartir nombre, foto y día/mes de cumpleaños, incluidos hijos. No publica edades, año de nacimiento, correos, notas o cuestionarios. Páginas de 8 familias, sin clasificación competitiva.
- Pestaña Admin: resúmenes de avance, fechas próximas, acompañamiento tras siete días sin completar, mensajes dirigidos y concesión/revocación de administradores. Páginas de 20 familias; propietario protegido.
- Bandeja de mensajes familiares, guía de bienvenida, Información permanente y acceso a Recuerdos desde Información.
- Configuración de mensajes y soporte, pausas de avisos, borradores y publicación de niveles; auditoría de cambios administrativos.
- Eliminación de cuenta con sesión reciente y limpieza por lotes; un marcador impide que tokens antiguos vuelvan a crear datos. El propietario debe transferir su rol fuera de la app antes de eliminarse.

## Alcance gratuito y notificaciones

Esta versión usa **Firebase Spark**, Authentication y Firestore; el cliente no llama Cloud Functions y `firebase.json` no despliega funciones. Spark tiene cuotas: no es capacidad ilimitada. Las miniaturas consumen almacenamiento/transferencia de Firestore y las consultas consumen lecturas. Se paginan comunidad y administración y las imágenes se excluyen de índices.

Cada teléfono programa sus propios avisos. Recuerdan el título del último reto sincronizado y, si existe una espera, desde cuándo estará disponible. El mismo reto se sigue recordando hasta completarlo y sincronizar. Android/iOS pueden presentarlos con la app cerrada, sujetos a permisos y restricciones del sistema. **No consultan Firebase antes de aparecer.** Si la pareja completa el nivel o el administrador pausa avisos mientras el otro teléfono está cerrado, este último conserva su programación hasta abrir/sincronizar. Un nivel nuevo se descubre al sincronizar. No se promete entrega a una hora exacta.

Los mensajes administrativos se guardan en la bandeja de la familia. Se reciben al abrir/sincronizar y, con avisos habilitados, se puede presentar una notificación local. **No hay push remoto inmediato con la app cerrada.** Para eso se necesitaría un emisor remoto seguro, aunque existan servicios con cuotas gratuitas. No se incluyen tokens Expo privados ni credenciales Admin en la app.

La base y las notas requieren conexión para confirmar operaciones. No se promete completar retos offline ni sincronización posterior de completados. La espera de 24 horas comienza solo al completar un reto. Registrarse, pulsar el botón inicial o abrir la app no inicia esa espera. Cambiar el horario local de avisos no adelanta los retos.

## Activar el proyecto del propietario

El proyecto es **entre-dos-db**. El bloque recibido está en `.env` local, excluido de Git. En otra computadora, copia `.env.example` y completa los seis identificadores públicos de Firebase. El campo `storageBucket` del bloque no significa que la app use Cloud Storage.

1. Habilita Authentication → Correo electrónico/contraseña y crea Firestore `(default)` Standard en modo producción. El propietario ya mostró ambos pasos completados en la consola.
2. Inicia sesión y despliega **solo Firestore**; no ejecutes `firebase init` sobre el proyecto existente:

```powershell
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore --project entre-dos-db
```

3. Registra tu cuenta y familia desde ENTRE DOS. En Firebase Authentication copia el UID de esa cuenta.
4. En Firestore, crea con acceso de propietario el documento `roles/EL_UID`, con el campo `role` de tipo **string** y valor **owner**. Esta es la asignación inicial fuera de la app; ningún cliente puede darse ese rol.
5. La cuenta recibe el permiso por suscripción y aparece Admin. En **Admin → Configurar mensajes, niveles y perfiles → Niveles**, pulsa **Preparar los 30 retos originales del nivel 1**, valida, revisa y confirma la publicación. Pulsa **Cargar catálogo inicial de bodas**. Guarda también la configuración de mensajes desde Aplicación.
6. Registra otra familia para comprobar aislamiento y prueba la misma cuenta en ambos teléfonos.

Alternativa del propietario con ADC (`gcloud auth application-default login`) o credenciales privadas fuera del repositorio:

```powershell
$env:GCLOUD_PROJECT = 'entre-dos-db'
npm run seed
npm --prefix functions run admin -- tu-correo@example.com owner
```

Los scripts de `functions/scripts` usan Admin SDK desde la computadora del propietario, sin desplegar servidores ni requerir Blaze. El publicador conserva los IDs y el recorrido de niveles existentes. La administración normal se realiza desde la app. Detalles en [docs/ADMINISTRACION.md](docs/ADMINISTRACION.md).

## Expo y tiendas

El ID EAS recibido es `f9af2154-9d1b-49d6-bae8-588d83ce3ad7`. Expo CLI ya está autenticado y el usuario abrió la app en Expo Go para iPhone. Falta confirmar el propietario/slug del proyecto existente antes de compilar. `com.sevenawesome.entredos` sigue siendo el identificador provisional.

```powershell
npx eas-cli@latest login
npx eas-cli@latest project:info
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

Configura las mismas variables públicas en el entorno de builds de Expo. Tras instalar el development build usa `npx expo start --dev-client`. El selector de fotos es un módulo nativo: al incorporarlo hay que generar un build actualizado. Los avisos locales no requieren credenciales de envío remoto FCM/APNs.

Para publicar se necesitan las cuentas de las tiendas, identidad legal, política pública y declaraciones de datos. Los requisitos/costos de tiendas y builds son independientes de usar Firebase Spark. Nada se ha enviado a las tiendas.

## Datos y seguridad

| Ruta | Contenido / acceso |
| --- | --- |
| `families/{uid}` | Perfil y fechas; familia y administradores. Edición administrativa auditada. |
| `families/{uid}/progress/{levelId}` | Retos, notas y cuestionarios; solo la propia cuenta, incluso frente a administradores. |
| `tracking/{uid}` | Resumen validado contra el progreso en la misma transacción; familia y administradores. |
| `roles/{uid}` | `owner`, `admin` o `member`; autoasignación prohibida. Reglas consultan el rol actual. |
| `community/{uid}` | Proyección consentida; otras cuentas solo pueden leer perfiles `visible: true`. |
| `avatars/{uid}` | Miniatura privada de la familia; la copia pública solo existe al participar. |
| `families/{uid}/inbox/{id}` | Mensaje administrativo dirigido; solo la familia destinataria puede leerlo. |
| `levels/{id}`, `levelOrders/{order}` | Catálogo y reserva de orden; borradores solo para administradores. |
| `config/app`, `familyControls/{uid}` | Mensajes, soporte y pausas; escritura administrativa auditada. |
| `catalogs/anniversaries` | Catálogo de bodas; copia inicial empaquetada como respaldo. |
| `adminAudit/{id}` | Actor, acción, destino y fecha; creación atómica con cambios, inmutable desde la app. |
| `accountDeletion/{uid}` | Marcador mínimo para impedir recreación tras eliminar la cuenta. |

Una cuenta administradora no accede a notas ni cuestionarios, pero sí a nombres, fechas y resúmenes para acompañamiento. Los administradores pueden administrar otros permisos; no pueden cambiar su propio rol ni el de un propietario. El propietario de infraestructura conserva las facultades de la consola/Admin SDK.

## Verificación

```powershell
npm run check
npx expo export --platform all
npx expo-doctor
```

Para las reglas se necesita Java 21 y un proyecto demo local; nunca se ejecutan pruebas destructivas contra el proyecto real:

```powershell
npx firebase-tools@latest emulators:exec --only firestore --project demo-entre-dos "node --test tests/spark.rules.mjs"
```

Las pruebas de reglas comprueban privacidad, promoción/revocación de roles, auditoría, bloqueo de 24 horas, publicación, miniaturas y cuestionario. La lista de pruebas físicas/pendientes está en [docs/VALIDACION.md](docs/VALIDACION.md).

## Contenido y estructura

`src/app` contiene rutas; `src/components` la UI; `src/domain` las reglas puras; `src/services/spark.ts` las transacciones; `spark-admin.ts` la administración; `notifications.ts` los avisos locales. `content/level-1.json` conserva los 30 retos y seis preguntas extraídos del documento; `source-paragraphs.json` conserva la extracción original. La numeración se deriva de los 30 retos reales a pesar de encabezados inconsistentes del documento.

Las fuentes/tradiciones del catálogo están en [docs/FUENTES_BODAS.md](docs/FUENTES_BODAS.md). Los nombres varían por país. `scripts/refresh-brand.ps1` genera SVG/PNG, iconos y splash. El SVG conserva texto editable; el PNG está listo para compartir.

`functions/src` conserva la arquitectura anterior como referencia y para pruebas de regresión; **no está conectada al cliente ni incluida en el despliegue actual**. Sus requisitos de Blaze/Expo Push no corresponden a la versión Spark.
