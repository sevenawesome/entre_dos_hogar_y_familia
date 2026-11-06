# Validación de la versión Firebase Spark

Verificado el 5 de noviembre de 2026. Las pruebas automatizadas usaron proyectos demo locales. Posteriormente el usuario registró su cuenta/familia real y se asignó a esa cuenta el rol propietario en `entre-dos-db`, con verificación del documento y de la auditoría. No se enviaron mensajes ni se crearon otras cuentas desde el agente.

## Comprobado localmente

- TypeScript y lint sin errores.
- 96 pruebas de dominio y regresión aprobadas, incluidas privacidad de la proyección pública, fotos, acompañamiento y programación local de celebraciones.
- 38 pruebas de seguridad aprobadas contra Firestore Emulator y una prueba de verificación contra Auth Emulator, en proyectos demo aislados. Comprueban creación atómica de familia/resumen, aislamiento entre familias, privacidad de notas incluso frente a administradores, secuencia de retos, intervalo de 24 horas con hora del servidor, cuestionario completo y bloqueo de respuestas inválidas.
- Casos positivos de límites: nivel de 50 retos, cuestionario de 30 respuestas multilínea y familia con diez hijos. También se probó que la fecha de matrimonio sea obligatoria para registrar, editar y avanzar, incluso ante intentos administrativos de retirarla; los cumpleaños permanecen opcionales. Se probaron concesión/revocación de administradores, protección del propietario, auditoría, bandeja privada, consentimiento público, contadores no falsificables, miniaturas y marcador de eliminación.
- Expo Doctor: 20/20 comprobaciones aprobadas.
- Exportación de bundles Android, iOS y web completada. Esto comprueba el empaquetado; no equivale a ejecutar un binario nativo.
- Navegador de 390 × 844: demostración persistente, foto elegida y comprimida desde el selector, consentimiento independiente para aniversario/progreso y perfil en Comunidad; completar el primer reto guarda la nota y bloquea el siguiente durante 24 horas desde el completado; panel Admin con progreso proporcional al tamaño real del nivel, fechas próximas, mensajes y revisión de permisos. Las acciones de administración están deshabilitadas en demostración.
- En el formulario móvil se comprobó el rechazo de una fecha de matrimonio vacía y el guardado correcto al restaurar una fecha válida, sin perder el progreso. Captura `preview-fecha-obligatoria.jpg`.
- Capturas nuevas con datos ficticios: `preview-comunidad.jpg`, `preview-admin.jpg` y `preview-celebraciones.jpg`. Las capturas anteriores conservan evidencia de guía, niveles, final sin sucesor y nuevo nivel.
- Configuración Firebase recibida en `.env` local excluido de Git. Las capturas del propietario muestran Authentication por correo habilitado y Firestore creado. El propietario desplegó reglas e índices desde Firebase CLI. La cuenta real registrada tiene rol propietario verificado y auditado; el nivel 1 (30 retos/seis preguntas), catálogo y configuración inicial están cargados y verificados en Firebase. Expo CLI está autenticado y el usuario confirmó apertura en Expo Go para iPhone.
- Auditoría npm del cliente en producción: 0 altas/críticas, 5 moderadas en la cadena de herramientas de Expo. Se mantienen versiones compatibles con SDK 58, sin forzar actualizaciones mayores.

Las fuentes antiguas de Cloud Functions se compilan como regresión, pero no están conectadas al cliente ni se despliegan con `firebase.json`. El funcionamiento actual depende de transacciones del cliente y reglas de Firestore.

## Repetir comprobaciones

```powershell
npm run check
npx expo export --platform all
npx expo-doctor
```

Con Java 21 instalado:

```powershell
npx firebase-tools@latest emulators:exec --only firestore,auth --project demo-entre-dos "npm run test:firebase"
```

`test:rules` necesita el emulador de Firestore en `127.0.0.1:8080`; inicializa y limpia únicamente la base demo indicada en el test.

## Pendiente con el proyecto real

- [x] Desplegar solo las reglas e índices de Firestore; registrar la primera familia y asignar `roles/UID.role = owner` con las credenciales del propietario y auditoría.
- [x] Cargar y verificar los 30 retos originales, catálogo de bodas y configuración inicial, con auditoría y sin sobrescribir documentos existentes.
- [ ] Registro, recuperación de contraseña y acceso simultáneo a una cuenta desde dos teléfonos.
- [ ] Edición de matrimonio/cumpleaños, edades, catálogo remoto y sincronización entre ambos teléfonos.
- [ ] Completar simultáneamente el mismo reto desde A y B genera un único avance; errores de conexión no se anuncian como éxito.
- [ ] Comprobar en teléfonos reales que el primer reto abre de inmediato y el siguiente solo abre 24 horas después de completar el anterior y que el cuestionario consigue el nivel.
- [ ] Publicar un nivel futuro de 50 retos cambia el estado de recorrido terminado a capítulo nuevo sin recompilar.
- [ ] Conceder/revocar roles con dos sesiones reales. Las notas y cuestionarios permanecen inaccesibles al administrador.
- [ ] Mensaje de Admin aparece solo en la bandeja destinataria al sincronizar; confirmar el guardado no promete entrega/lectura.
- [ ] Desactivar Comunidad retira el perfil de consultas posteriores. Los datos públicos previamente vistos no pueden recuperarse de copias ajenas.
- [ ] Foto desde Android/iOS, orientación, recorte, compresión, reemplazo y retirada.
- [ ] Eliminación con sesión reciente, reintento tras interrupción y bloqueo de escrituras con tokens antiguos. El propietario transfiere su rol antes de eliminarse.

## Notificaciones locales en Android e iOS

- [ ] Development builds con el módulo de fotos actualizado; no se necesitan FCM/APNs de envío remoto.
- [ ] Permisos y horarios diferentes por teléfono; aviso diario general con la app cerrada y apertura de Hoy al tocarlo.
- [ ] Cumpleaños y aniversarios de los próximos dos años, incluidos años bisiestos y varias celebraciones el mismo día.
- [ ] Completar todo elimina el diario al sincronizar y conserva celebraciones. Un nivel nuevo lo reactiva después de abrir/sincronizar.
- [ ] Pausa global/familiar, cambio de zona horaria y cambios hechos en el otro teléfono se aplican después de sincronizar; un teléfono cerrado conserva su programación anterior.
- [ ] Mensaje recién sincronizado presenta aviso local si los permisos están activos; al tocarlo abre la bandeja y no lo repite.
- [ ] Cierre de sesión cancela avisos propios; denegar permisos explica cómo activarlos.
- [ ] Comprobar restricciones de batería y comportamiento del sistema en builds release. No se promete hora exacta ni push remoto inmediato con la app cerrada.

## Publicación

- [ ] Confirmar propietario/slug EAS, identificadores finales y variables del entorno de builds.
- [ ] Teléfono pequeño, texto grande, lector de pantalla, teclado, iconos y splash en Android/iPhone.
- [ ] Política de privacidad pública, contacto, eliminación y declaraciones de datos de ambas tiendas.
- [ ] Cuentas de tiendas y binarios firmados. No se ha enviado ninguna versión a Google Play o App Store.

## Inicio, fotos individuales y correo

- Demostración móvil a 390 × 844: botón inicial abre el reto 1 sin completarlo; desaparece después de comenzar y permanece ausente al restaurar la demostración. El primer completado muestra la fecha/hora del siguiente reto. La espera empieza al completar, incluso si el reto estuvo pendiente varios días.
- Fotos elegidas mediante el selector y comprimidas; fotos individuales de pareja e hija, privadas inicialmente; publicación por persona y retirada independiente de consentimiento. La retirada elimina la tarjeta comunitaria y conserva la foto privada. Persistencia tras recargar y volver a entrar a demostración.
- Ampliación y cierre de foto familiar y de la persona que cumple años. Tarjeta comunitaria sin edades ni año de nacimiento. Capturas: `preview-inicio-recorrido.jpg` y `preview-comunidad-fotos.jpg`, con datos ficticios e imagen del proyecto.
- Reglas: inicio inmutable y compartido, espera de 24 horas desde el completado confirmado y ausencia de saltos tras varios días pendientes; documentos de fotos privados incluso frente a administradores; validación de tamaño/tipo, metadatos de edición y consentimiento; publicación/retiro con doce integrantes; edición de foto y familia; el cliente no puede falsificar el estado de correo verificado.
- Auth Emulator: crear cuenta, solicitar enlace, confirmar el código, recargar y comprobar el claim `email_verified`. No se enviaron correos reales. Falta comprobar recepción del correo de verificación y permisos/avisos con iPhone y Android físicos.

Ajuste de cadencia: primer reto inmediato; los pendientes no caducan. Pruebas de recordatorios con el mismo reto tras varios días y del mensaje de disponibilidad del siguiente. Las reglas rechazan avanzar solo porque transcurrieron días desde el inicio.

Comprobación visual del ajuste de cadencia: comenzar abre el primer reto sin completarlo; volver a Hoy conserva el mismo reto pendiente. Tras completarlo, Hoy muestra fecha/hora del siguiente y su pantalla impide marcarlo antes de tiempo. Captura con familia ficticia: `preview-espera-reto.jpg`.
