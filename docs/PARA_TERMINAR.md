# Qué falta para terminar y publicar Entre dos

La app se puede revisar en demostración. Para ponerla en funcionamiento con datos compartidos y avisos reales, se necesitan los siguientes proyectos y datos del propietario.

## Firebase

El proyecto **entre-dos-db** ya existe y quedó seleccionado en `.firebaserc`. Falta la configuración pública de una app web: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`. En Firebase: Configuración del proyecto → General → Tus apps → Agregar app web (`</>`) → registrar → copiar el bloque completo `firebaseConfig`. Esos valores completan `.env.example`; no hace falta enviar contraseñas ni claves privadas.

Habilitar Authentication por correo/contraseña y crear Firestore. La captura muestra el plan Spark; el propietario debe activar Blaze para desplegar las funciones programadas. No se ha modificado la facturación.

Para desplegar el backend, el propietario inicia sesión con Firebase CLI en su computadora. Las credenciales de administrador y secretos se configuran localmente y en Secret Manager; no se publican en el código ni se envían por chat. Después se despliegan reglas, índices y funciones y se carga el catálogo.

## Expo y notificaciones

La cuenta y proyecto de Expo ya existen. Se incorporó el ID **f9af2154-9d1b-49d6-bae8-588d83ce3ad7** en la configuración. Falta iniciar sesión localmente con EAS y verificar el propietario y slug del proyecto existente antes del primer build; `project:info` no pudo consultarlos porque no hay sesión de Expo en esta computadora. El enlace al proyecto en Expo permite contrastar esos datos sin compartir credenciales.

Configurar FCM v1 y APNs con las cuentas propietarias de Firebase y Apple. El secreto de Expo Push se guarda mediante Firebase CLI. Los pasos y comandos están en el README.

## Administrador

El propietario ya indicó el correo que usará. Una vez conectado Firebase, debe registrarse en ENTRE DOS con ese correo; después se le asigna el permiso administrativo con el script del propietario. El correo por sí solo no concede permisos. El panel vive en **Información → Administración**, con una vista previa de solo lectura disponible en demostración. Instrucciones en [ADMINISTRACION.md](ADMINISTRACION.md).

## Identidad de publicación

Facilitar el nombre legal de la organización responsable, país, correo de soporte y contacto para privacidad. Indicar el dominio o sitio donde se publicará la política de privacidad y la página para solicitar eliminación de cuenta. Confirmar el nombre público **Entre dos** y la firma **By Departamento de Hogar y Familia**. El logo nuevo ya tiene versiones SVG/PNG; una foto para el splash es opcional.

Confirmar si el nivel 1 se publicará con el contenido actual y si la primera versión será gratuita. Los próximos niveles se pueden publicar después desde Firebase, sin crear una nueva versión de la app para cada catálogo.

## Cuentas de tiendas y pruebas

Crear las cuentas de Google Play Console y Apple Developer bajo el titular correcto. Las sesiones, invitaciones de equipo y credenciales de firma se gestionan en los servicios oficiales. No hace falta enviar contraseñas por chat.

Disponer de un teléfono Android y un iPhone para instalar los builds y verificar los avisos, la sincronización, el aniversario y la eliminación de la cuenta. Se necesitan los correos de quienes harán la prueba interna o TestFlight cuando corresponda.

## Trabajo final con esos datos

Conectar Firebase/Expo, desplegar el backend, probar con ambos teléfonos y completar la lista de `VALIDACION.md`. Después preparar capturas, ficha de las tiendas, política pública y declaraciones de datos, generar los builds firmados y enviarlos a revisión. La aprobación y publicación dependen de cada tienda.

La fecha de matrimonio y los cumpleaños se agregan desde Nosotros por cada familia. Las fechas y nombres de la familia de demostración son ficticios y sirven para revisar las cuentas regresivas y las edades. El catálogo de bodas se carga en Firebase junto al nivel 1; no requiere redactar las categorías de nuevo.
