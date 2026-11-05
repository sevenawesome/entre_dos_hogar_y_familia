# Entre dos

Aplicación para parejas en **React Native + Expo + TypeScript + Redux Toolkit + Firebase**, con bundles para Android e iOS y una vista web para revisar la experiencia. Identidad de **Entre dos · By Departamento de Hogar y Familia**, con logo vectorial, iconos y splash incluidos.

## Probar ahora

Requiere Node 24.12 o posterior y npm. Desde esta carpeta:

```powershell
npm install
npm run web
```

En la pantalla de acceso, elige **Explorar demostración** y registra a la familia. No requiere credenciales. Guarda el progreso en ese navegador o teléfono; **no sincroniza entre dispositivos ni envía notificaciones**. El primer reto se puede completar inmediatamente; el segundo se habilita el siguiente día, también en demostración.

Para desarrollo móvil:

```powershell
npm start
```

Los avisos push se prueban con un development build instalado en un teléfono, no con la vista web. Sigue la [configuración oficial de Expo Notifications](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Qué incluye

- Cuenta por correo y contraseña, persistencia de sesión y recuperación de contraseña.
- Una cuenta familiar compartida en los teléfonos de ambos integrantes.
- Registro de pareja e hijos o hijas mediante nombres o apodos y fechas de cumpleaños opcionales.
- Fecha de matrimonio opcional, tarjeta con aro de cuenta regresiva y años del próximo aniversario. Usa la zona horaria familiar; las bodas del 29 de febrero se recuerdan el 28 en años no bisiestos.
- Años de matrimonio ya cumplidos y próximo aniversario, con categorías que se abren al tocarlas. Catálogo de 60 bodas tradicionales: años 1–50 y los hitos cada cinco años hasta 100. Los nombres varían por país; las reflexiones son textos propios de ENTRE DOS.
- Cumpleaños de ambos integrantes y sus hijos, edad actual, próxima edad y una barra anual de cuenta regresiva. Son una ayuda secundaria después del reto y el aniversario.
- Nivel 1 con los **30 retos reales y las seis preguntas finales** del documento proporcionado.
- Un reto pendiente a la vez. Si no se completa, se recuerda nuevamente cada día. Después de completarlo, el siguiente se abre al comenzar el próximo día de la zona horaria de la familia.
- Confirmación de participación de ambos antes de completar. Es una declaración compartida; no requiere dos aprobaciones independientes porque ambos usan la misma cuenta.
- Progreso sincronizado con Firestore y transacciones en el servidor para evitar completar dos veces desde ambos teléfonos.
- Notas opcionales, historial de momentos y lectura de reflexiones finales.
- Niveles dinámicos, con cantidad variable de retos y prerrequisito. Se consiguen tras completar retos **y** cuestionario.
- Nivel actual destacado, celebración al conseguir el último disponible y anuncio de un nuevo capítulo desbloqueado. El límite de un reto diario también se conserva al cambiar de nivel.
- Bienvenida guiada de cinco pasos en la primera visita de cada cuenta en cada teléfono, con acceso posterior desde la pestaña Información y ayuda detallada.
- Panel administrativo protegido en Información: configuración de mensajes y soporte, borradores/publicación de niveles, consulta y edición básica de familias y pausa de avisos. Auditoría de acciones y vista previa de solo lectura en demostración.
- Recordatorios diarios mediante Cloud Scheduler, Cloud Functions y Expo Push; preferencias independientes por teléfono y zona horaria. Comprobación de recibos y desactivación de tokens inválidos.
- Saludo de aniversario en el horario de recordatorios de cada teléfono, incluso si ya consiguieron todos los niveles. Si también corresponde un reto, se incluyen ambos en un solo aviso. El saludo confirmado se registra por dispositivo y aniversario para no repetirlo en reintentos normales.
- Saludos de cumpleaños con nombre y edad, combinados con el aniversario y el reto cuando coinciden. Para varias celebraciones se muestra un resumen y la lista completa permanece en la app; los avisos siguen sujetos a permisos y configuración.
- Pausa de avisos, cierre de sesión con desregistro del teléfono y eliminación de cuenta familiar.
- Diseño adaptable con coral, frambuesa, violeta y dorado, textos en español e identidad compartida entre acceso, inicio, perfil, iconos y splash.
- Marca **ENTRE DOS · By Departamento de Hogar y Familia** y crédito enlazado **Creado por SevenAwesome** en [sevenawesome.com](https://www.sevenawesome.com/).

## Conectar Firebase

1. El proyecto del propietario es **entre-dos-db** y está seleccionado en `.firebaserc`. El bloque `firebaseConfig` recibido ya está guardado en `.env` local, excluido de Git. En otra computadora, copia `.env.example` y completa los seis valores públicos de Firebase. Habilita Authentication → Email/Password en el proyecto.
2. Crea Firestore. Para las funciones programadas debes habilitar facturación en el plan **Blaze**. Configura alertas de presupuesto según el uso previsto.
3. Copia `.env.example` a `.env` y completa sus valores `EXPO_PUBLIC_FIREBASE_*`. Son identificadores públicos del cliente; el acceso se controla con reglas y autenticación. **Nunca coloques credenciales Admin o archivos de cuenta de servicio en variables EXPO_PUBLIC.**
4. Instala las dependencias de servidor y autentícate:

```powershell
npm install --prefix functions
npx firebase-tools@latest login
```

5. Crea un token de acceso de Expo para el servicio de notificaciones y guárdalo como secreto de Firebase:

```powershell
npx firebase-tools@latest functions:secrets:set EXPO_ACCESS_TOKEN --project TU_FIREBASE_PROJECT_ID
```

Habilita la seguridad de acceso al servicio push en Expo para exigir este token. No uses este secreto en el cliente móvil.

6. Despliega las reglas, índices y funciones:

```powershell
npx firebase-tools@latest deploy --only firestore,functions --project TU_FIREBASE_PROJECT_ID
```

La región del servidor es `us-central1`. Si la cambias en `functions/src/index.ts`, ajusta `EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION`. Los índices pueden tardar en construirse.

7. Carga el catálogo con un entorno autenticado con **Application Default Credentials** (`gcloud auth application-default login`) o `GOOGLE_APPLICATION_CREDENTIALS` apuntando a un archivo privado fuera del repositorio:

```powershell
$env:GCLOUD_PROJECT = 'TU_FIREBASE_PROJECT_ID'
npm run seed
```

8. Reinicia Metro al cambiar `.env`. Crea una cuenta, registra a la familia e inicia sesión con el mismo correo en el segundo teléfono.

## Vincular Expo y preparar las tiendas

```powershell
npx eas-cli@latest login
npx eas-cli@latest project:info
```

El ID del proyecto existente, **f9af2154-9d1b-49d6-bae8-588d83ce3ad7**, ya está en `.env.example` y como valor predeterminado en `app.config.ts`. La variable `EXPO_PUBLIC_EAS_PROJECT_ID` permite cambiarlo por entorno. Configura también las variables de Firebase en el entorno de Expo usado para los builds. Después de iniciar sesión, verifica el propietario y slug del proyecto con `project:info` y ajusta la configuración al proyecto existente; aún no se han podido consultar sin sesión local EAS. No crees un segundo proyecto.

Antes del primer build, confirma los identificadores de aplicación en `app.config.ts`: `com.sevenawesome.entredos` es provisional. Configura las credenciales de notificaciones con `npx eas-cli@latest credentials`: FCM v1 para Android y APNs para iOS.

```powershell
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

Instala los builds y ejecuta `npx expo start --dev-client`. Activa y guarda los avisos desde **Nosotros** en ambos teléfonos. El programador corre cada 15 minutos; el aviso llega en la ventana posterior al horario elegido y está sujeto a conexión, permisos y condiciones del sistema operativo. Un servicio push no garantiza entrega a una hora exacta.

Para distribución:

```powershell
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform android
npx eas-cli@latest submit --platform ios
```

Se necesitan las cuentas de Google Play Console y Apple Developer, las fichas de tienda, capturas, política de privacidad pública y declaraciones de datos revisadas por el responsable de la app. El texto de privacidad dentro de la app es una base funcional; completa la identidad y el contacto del responsable antes de publicar. La app **no se ha desplegado ni enviado a ninguna tienda** con este repositorio.

## Agregar niveles sin publicar una nueva app

El panel **Información → Administración → Niveles** permite preparar borradores, validar y publicar el catálogo desde la app. La cuenta debe tener el custom claim `admin: true`; la asignación inicial la hace el propietario con el script seguro. La configuración, permisos, edición de familias y auditoría están explicados en [docs/ADMINISTRACION.md](docs/ADMINISTRACION.md). También está disponible la alternativa por CLI siguiente.

Duplica `content/level-1.json` en otro archivo y modifica:

```json
{
  "id": "nivel-2",
  "order": 2,
  "title": "Un nuevo capítulo",
  "subtitle": "50 momentos para seguir creciendo.",
  "description": "Descripción del nivel.",
  "published": true,
  "prerequisiteId": "nivel-1",
  "challenges": [],
  "questions": []
}
```

Completa los arrays: cada reto usa `id`, `order` (1, 2, 3…), `title`, `description`, `reflection`, `stage` y `minutes`; cada pregunta usa `id` y `label`. No subas arrays vacíos. El publicador valida 1–200 retos y 1–30 preguntas por nivel. Usa un ID nuevo y conserva los identificadores de lo ya publicado.

```powershell
$env:GCLOUD_PROJECT = 'TU_FIREBASE_PROJECT_ID'
npm --prefix functions run publish-level -- ../content/level-2.json
```

Las apps suscritas a Firestore muestran el nivel nuevo automáticamente y lo desbloquean al conseguir su prerrequisito. **No es necesario cambiar el código ni desplegar otro binario.** El publicador impide sobrescribir niveles existentes para proteger el historial. El catálogo incluye solo el nivel 1 real; no se han inventado los futuros 50 retos.

## Catálogo de bodas en Firebase

`npm run seed` carga tanto el nivel 1 como `content/anniversary-catalog.json`. Las categorías se guardan en `catalogs/anniversaries`, con versión, fuentes, nombre del material, reflexión y propuesta. La app escucha este documento en tiempo real y trae una copia inicial para demostración y como respaldo si el catálogo aún no fue cargado.

Para actualizar nombres o explicaciones sin publicar otra app, edita el JSON, incrementa `version` y ejecuta:

```powershell
$env:GCLOUD_PROJECT = 'TU_FIREBASE_PROJECT_ID'
npm --prefix functions run publish-anniversaries -- ../content/anniversary-catalog.json
```

No se presenta la lista como una norma universal. Un año sin categoría, como el 51, muestra sus años de matrimonio con una reflexión general. Los textos de cada categoría se abren desde las bodas actuales o próximas y desde el catálogo completo. Las fuentes y el criterio están en [docs/FUENTES_BODAS.md](docs/FUENTES_BODAS.md).

Las fechas de cumpleaños se guardan en la familia (`partner1BirthDate`, `partner2BirthDate` y `children[].birthDate`); la edad se calcula al mostrarla, sin guardar una edad que pueda quedar desactualizada. Los hijos nuevos tienen un ID estable para que cambiar el orden no duplique recordatorios. Las fechas son opcionales, editables y eliminables dejando el campo vacío. El 29 de febrero se observa el 28 en años no bisiestos, igual que el aniversario.

## Datos y responsabilidades

| Ruta                                | Contenido                                           | Escritura                                |
| ----------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `levels/{levelId}`                  | Retos, preguntas y prerrequisito                    | Publicador con Admin SDK                 |
| `config/app`                        | Mensajes, soporte y pausa global                    | Función administrativa con versión       |
| `familyControls/{uid}`              | Pausa administrativa de una familia                 | Función administrativa                   |
| `adminAudit/{id}`                   | Actor, acción, destino y fecha                      | Servidor y script de rol del propietario |
| `families/{auth.uid}`               | Pareja, familia y zona horaria                      | Su cuenta, con validación de reglas      |
| `catalogs/anniversaries`            | Categorías de bodas, reflexiones, versión y fuentes | Publicador con Admin SDK                 |
| `families/{uid}/progress/{levelId}` | Retos, notas, próximo día y respuestas              | Funciones autenticadas con transacciones |
| `families/{uid}/state/daily`        | Bloqueo diario entre todos los niveles              | Servidor; transacción de completado      |
| `families/{uid}/devices/{deviceId}` | Token, horario y próxima notificación               | Función `saveDevice`                     |
| `pushReceipts/{receiptId}`          | Comprobación temporal de entrega                    | Servidor; TTL de un día                  |
| `deletedAccounts/{uid}`             | Bloqueo temporal de tokens tras eliminar cuenta     | Servidor; TTL de dos horas               |

La zona horaria familiar se fija al crear la familia y evita que cambiar la hora del segundo teléfono permita completar más de un reto por día. La zona horaria de avisos sí se actualiza por teléfono. Las respuestas y notas son compartidas y requieren conexión para confirmarse. El modo real nunca finge haber guardado una acción fallida. El SDK JS de Firestore no ofrece persistencia offline de disco en React Native: no se promete edición offline ni sincronización posterior de completados.

El servidor usa un bloqueo temporal para evitar envíos simultáneos, reintenta errores y revisa recibos. Una falla entre enviar a Expo y guardar la confirmación puede ocasionar un aviso duplicado: la entrega exactamente una vez no se garantiza. Los avisos diarios de retos se omiten cuando ya no hay niveles pendientes y se retoman si se publica uno nuevo. El saludo de aniversario sigue activo cada año si hay fecha de matrimonio y recordatorios habilitados. Los avisos programados justo antes de medianoche conservan la fecha prevista dentro de su ventana de envío.

Los cumpleaños usan esa misma programación y se registran por persona, fecha y dispositivo después de un envío aceptado. Pueden seguir recordándose después de terminar los niveles. Los avisos pueden mostrar nombre y edad en la pantalla bloqueada; las notas y respuestas de pareja nunca forman parte del mensaje.

## Verificación

```powershell
npm run check
npm run functions:build
npm run export:web
npx expo-doctor
```

Las 69 pruebas cubren contenido, orden y límite diario entre niveles, cuestionario como condición de desbloqueo, estados del recorrido, validaciones administrativas y rechazo de peticiones sin rol, guía, zonas horarias, cambios de horario y aniversarios, incluidos años bisiestos y recordatorios sin retos pendientes. La lista de comprobaciones reales en dos teléfonos y para las tiendas está en [docs/VALIDACION.md](docs/VALIDACION.md). Los datos y accesos que faltan para publicar están en [docs/PARA_TERMINAR.md](docs/PARA_TERMINAR.md).

## Estructura

`src/app` contiene las pantallas de Expo Router; `src/components` la UI; `src/domain` las reglas puras de progreso y aniversarios; `src/store` Redux; `src/services` Firebase y notificaciones; `functions` el backend; `content` el catálogo extraído. `scripts/refresh-brand.ps1` genera los gráficos de marca. El logo completo está en `assets/logo.svg` y `assets/logo.png`; los iconos y el splash usan la misma identidad. La versión SVG conserva texto editable y puede depender de la fuente disponible al abrirse; el PNG está listo para compartir.

La extracción original se conserva en `content/source-paragraphs.json`. El documento tenía encabezados de 40 retos y rangos de etapas inconsistentes, pero 30 retos reales: la app conserva los textos de esos 30 y las seis preguntas, y deriva la numeración del contenido real.
