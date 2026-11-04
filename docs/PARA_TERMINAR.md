# Qué falta para terminar y publicar Entre dos

La app se puede revisar en demostración. Para ponerla en funcionamiento con datos compartidos y avisos reales, se necesitan los siguientes proyectos y datos del propietario.

## Firebase

Crear el proyecto, habilitar Authentication por correo/contraseña y Firestore, y activar Blaze para las funciones programadas. Compartir el ID del proyecto y la configuración pública de una app web: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`. Esos valores completan `.env.example`.

Para desplegar el backend, el propietario inicia sesión con Firebase CLI en su computadora. Las credenciales de administrador y secretos se configuran localmente y en Secret Manager; no se publican en el código ni se envían por chat. Después se despliegan reglas, índices y funciones y se carga el catálogo.

## Expo y notificaciones

Crear una cuenta y proyecto de Expo, facilitar el nombre de usuario u organización y el ID del proyecto EAS. Iniciar sesión localmente para crear builds. Configurar FCM v1 y APNs con las cuentas propietarias de Firebase y Apple. El secreto de Expo Push se guarda mediante Firebase CLI.

Los pasos y comandos están en el README. Si estos servicios todavía no existen, el primer paso es crearlos bajo la cuenta de la organización.

## Identidad de publicación

Facilitar el nombre legal de la organización responsable, país, correo de soporte y contacto para privacidad. Indicar el dominio o sitio donde se publicará la política de privacidad y la página para solicitar eliminación de cuenta. Confirmar el nombre público **Entre dos** y la firma **By Departamento de Hogar y Familia**. El logo nuevo ya tiene versiones SVG/PNG; una foto para el splash es opcional.

Confirmar si el nivel 1 se publicará con el contenido actual y si la primera versión será gratuita. Los próximos niveles se pueden publicar después desde Firebase, sin crear una nueva versión de la app para cada catálogo.

## Cuentas de tiendas y pruebas

Crear las cuentas de Google Play Console y Apple Developer bajo el titular correcto. Las sesiones, invitaciones de equipo y credenciales de firma se gestionan en los servicios oficiales. No hace falta enviar contraseñas por chat.

Disponer de un teléfono Android y un iPhone para instalar los builds y verificar los avisos, la sincronización, el aniversario y la eliminación de la cuenta. Se necesitan los correos de quienes harán la prueba interna o TestFlight cuando corresponda.

## Trabajo final con esos datos

Conectar Firebase/Expo, desplegar el backend, probar con ambos teléfonos y completar la lista de `VALIDACION.md`. Después preparar capturas, ficha de las tiendas, política pública y declaraciones de datos, generar los builds firmados y enviarlos a revisión. La aprobación y publicación dependen de cada tienda.

La fecha de matrimonio y los cumpleaños se agregan desde Nosotros por cada familia. Las fechas y nombres de la familia de demostración son ficticios y sirven para revisar las cuentas regresivas y las edades. El catálogo de bodas se carga en Firebase junto al nivel 1; no requiere redactar las categorías de nuevo.
