# Validación de la versión Firebase Spark

Verificado el 5 de noviembre de 2026. No se han escrito cuentas, roles, mensajes ni contenido de prueba en `entre-dos-db`.

## Comprobado localmente

- TypeScript y lint sin errores.
- 82 pruebas de dominio y regresión aprobadas, incluidas privacidad de la proyección pública, fotos, acompañamiento y programación local de celebraciones.
- 26 pruebas de seguridad aprobadas contra Firestore Emulator, en el proyecto aislado `demo-entre-dos-rules`. Comprueban creación atómica de familia/resumen, aislamiento entre familias, privacidad de notas incluso frente a administradores, secuencia de retos, intervalo de 24 horas con hora del servidor, cuestionario completo y bloqueo de respuestas inválidas.
- Casos positivos de límites: nivel de 50 retos, cuestionario de 30 respuestas multilínea y familia con diez hijos. También se probaron concesión/revocación de administradores, protección del propietario, auditoría, bandeja privada, consentimiento público, contadores no falsificables, miniaturas y marcador de eliminación.
- Expo Doctor: 20/20 comprobaciones aprobadas.
- Exportación de bundles Android, iOS y web completada. Esto comprueba el empaquetado; no equivale a ejecutar un binario nativo.
- Navegador de 390 × 844: demostración persistente, foto elegida y comprimida desde el selector, consentimiento independiente para aniversario/progreso y perfil en Comunidad; completar el primer reto guarda la nota y bloquea el siguiente por 24 horas; panel Admin con progreso proporcional al tamaño real del nivel, fechas próximas, mensajes y revisión de permisos. Las acciones de administración están deshabilitadas en demostración.
- Capturas nuevas con datos ficticios: `preview-comunidad.jpg`, `preview-admin.jpg` y `preview-celebraciones.jpg`. Las capturas anteriores conservan evidencia de guía, niveles, final sin sucesor y nuevo nivel.
- Configuración Firebase recibida en `.env` local excluido de Git. Las capturas del propietario muestran Authentication por correo habilitado y Firestore creado. Sin sesión Firebase CLI/ADC para desplegar; el rol propietario real y la carga inicial siguen pendientes.
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
npx firebase-tools@latest emulators:exec --only firestore --project demo-entre-dos "npm run test:rules"
```

`test:rules` necesita el emulador de Firestore en `127.0.0.1:8080`; inicializa y limpia únicamente la base demo indicada en el test.

## Pendiente con el proyecto real

- [ ] Desplegar solo las reglas e índices de Firestore; registrar la primera familia y asignar `roles/UID.role = owner` desde la consola del propietario.
- [ ] Cargar los 30 retos originales, catálogo de bodas y configuración desde Admin.
- [ ] Registro, recuperación de contraseña y acceso simultáneo a una cuenta desde dos teléfonos.
- [ ] Edición de matrimonio/cumpleaños, edades, catálogo remoto y sincronización entre ambos teléfonos.
- [ ] Completar simultáneamente el mismo reto desde A y B genera un único avance; errores de conexión no se anuncian como éxito.
- [ ] El siguiente reto abre a las 24 horas del anterior, también entre niveles; el cuestionario consigue el nivel.
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
