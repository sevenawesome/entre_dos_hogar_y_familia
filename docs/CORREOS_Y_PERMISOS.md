# Administración, correos y permisos

Firebase permanece en Spark. El Worker `entre-dos-correo` está publicado en `https://entre-dos-correo.sevenawesome-srl.workers.dev` con **SEND_ENABLED=false**. Resend tiene verificado `correo.sevenawesome.com` y los tres secretos ya están cargados únicamente en Cloudflare. No se han enviado correos personalizados reales de prueba ni se han cambiado roles reales durante esta reorganización.

## Una administración con ocho secciones

| Pestaña | Contenido | Permiso |
| --- | --- | --- |
| Familias | Búsqueda exacta por correo/UID, perfiles y progreso resumido; edición y pausa familiar con permiso adicional. | `families.view`, editar: `families.edit` |
| Fechas | Cumpleaños y aniversarios en los próximos 30 días de las familias cargadas. | `families.view` |
| Seguimiento | Familias que llevan siete días o más sin avanzar. | `families.view` |
| Notificaciones | Mensaje a la bandeja; aviso local al sincronizar. No usa Resend. | `messages.send` |
| Correos | Búsqueda de destinatario, control administrativo de recepción, borrador y confirmación; consumo diario/mensual UTC. | `emails.send` |
| Administradores | Buscar cuenta registrada, crear administrador, elegir permisos, retirarlos. | `roles.manage` |
| Niveles | Borradores, validación y publicación; catálogo de bodas. | `content.manage` |
| Configuración | Mensajes de la app, soporte y habilitación de avisos del teléfono. | `settings.manage` |

En **Correos → Ajustes de correo**, `settings.manage` permite cambiar remitente dentro del dominio verificado, respuesta, pausa, categorías, límites y plantillas. Puede acceder a esos ajustes sin permiso para enviar a familias. El propietario ve todo. Los demás solo ven las secciones concedidas. Las rutas antiguas `/admin?section=...` redirigen a la sección correspondiente del mismo panel.

Para crear un administrador: Admin → Administradores → buscar correo o UID de una cuenta que ya registró su familia → activar «Esta cuenta es administradora» → elegir permisos → confirmar → guardar. Para retirarlo, apagar esa opción y guardar. Los permisos de notificaciones y correos son independientes. Los permisos dependientes incluyen consultar familias. No se permite cambiar el propio rol, modificar al propietario, conceder permisos superiores a los propios ni modificar un administrador con permisos superiores. Las reglas comprueban los permisos vigentes en cada operación; el Worker los vuelve a comprobar antes de enviar. Los administradores anteriores sin lista explícita conservan su acceso hasta que el propietario lo edite.

## Política de correo para cuidar la cuota

- Firebase envía verificación al crear la cuenta y recuperación cuando se solicita. No consumen Resend y tienen sus propias cuotas de Authentication.
- **Bienvenida personalizada:** evento único al registrar la familia; espera a que Auth confirme la dirección. Un registro por sí solo no comienza los retos. La bienvenida invita a comenzar de inmediato.
- **Nivel conseguido:** evento único al terminar todos los retos y el cuestionario. No se envía al completar solo el último reto.
- **Correo manual:** únicamente desde Admin → Correos, con destinatario encontrado, asunto/cuerpo, revisión y confirmación. No crea una notificación en la bandeja.
- No hay correos diarios de retos, cumpleaños ni aniversarios. Esos avisos siguen en los teléfonos. La pausa de notificaciones no pausa los correos y viceversa.

Nosotros conserva la verificación, recuperación y cambio de contraseña, pero ya no tiene interruptores de recepción de correo. El administrador controla `emailPreferences/{uid}.enabled`; la ausencia del documento permite los avisos transaccionales descritos al registrarse. Una baja firmada desde el correo establece `unsubscribed=true`; las reglas impiden anularla desde la app, incluso al administrador. Las preferencias antiguas desactivadas se respetan hasta una decisión administrativa; las categorías y horarios diarios antiguos ya no se procesan.

Cada correo lleva enlace de baja: GET muestra confirmación sin cambiar nada; POST firmado desactiva futuros envíos, aunque no existiera un documento de recepción. No afecta a los correos de acceso de Firebase. Se usan avisos sobre la cuenta y el programa, sin campañas publicitarias.

## Eventos, cuotas e idempotencia

`mailEvents/welcome-{uid}` se crea en la misma transacción del primer perfil/resumen. `mailEvents/level-{uid}-{levelId}` se crea junto al cierre del nivel. Las reglas exigen esa prueba, el UID propio y timestamps del servidor. Los clientes no pueden crear eventos arbitrarios, repetirlos, cambiar destinatarios ni reiniciarlos. Dos dispositivos que confirman el mismo cierre generan el mismo evento.

El cron revisa trabajo pendiente cada diez minutos y procesa como máximo una entrega por ciclo, alternando eventos y correos manuales. No recorre todas las familias. Las cuotas predeterminadas de la implementación son 90 reservas diarias y 2700 mensuales, compartidas, con límites reducibles desde Admin. No equivalen a una promesa de entrega ni sustituyen las cuotas del proveedor y de Firebase Spark. Consulta los [límites de Cloudflare](https://developers.cloudflare.com/workers/platform/limits/) y el [plan de Resend](https://resend.com/pricing).

Los presupuestos UTC se reservan atómicamente y no se devuelven automáticamente ante un fallo. Los reintentos usan contenido y clave idénticos dentro de 23 horas. Después queda `review_required` y no se reenvía automáticamente. La bienvenida pendiente de verificación caduca a los 30 días; los eventos de nivel y mensajes manuales a los dos días. Se comprueban dirección verificada y habilitada de Auth, recepción/baja y versión, eliminación y permiso vigente del emisor. Los trabajos de categorías diarias antiguas se suprimen. `accepted` significa aceptado por Resend, no entregado ni leído; no hay webhook de entrega/rebote.

El Worker solo lee nombre familiar, título del nivel y `finishedAt` para preparar eventos. No lee notas, respuestas ni fotos. El contenido del trabajo se elimina al finalizar; eliminar la cuenta limpia recepción, eventos, cola y trabajos propios. El endpoint público solo expone salud y baja firmada, sin una API abierta para enviar correos. Nunca se guardan claves privadas en Firebase ni Expo.

## Qué falta para activarlo

1. Completado por el usuario: cuentas gratuitas en [Resend](https://resend.com/) y [Cloudflare](https://dash.cloudflare.com/), y autorización de Wrangler.
2. Completado: `correo.sevenawesome.com` verificado en Resend, con DNS en GoDaddy. Remitente configurado: `avisos@correo.sevenawesome.com`. **No se puede verificar gmail.com**: el Gmail indicado sirve para recibir respuestas, soporte y registrar las cuentas.
3. Completado por el usuario: cuenta de servicio `entre-dos-correo@entre-dos-db.iam.gserviceaccount.com`, con `roles/datastore.user` (Usuario de Cloud Datastore) y `roles/firebaseauth.viewer` (Visualizador de Firebase Authentication). Se verificaron los IDs en la política IAM: ambos sin condiciones y ningún rol adicional. No usar Owner/Editor. Su clave se mantiene fuera del repositorio y de este chat. La cuenta puede consultar datos de Firestore por IAM; el código solo necesita nombre familiar, metadatos de cierre del nivel, título del nivel, estado de correo, roles y cola, sin leer notas/respuestas ni fotos.
4. Completado: `email-worker/wrangler.jsonc` fija la cuenta Cloudflare autorizada, proyecto, `PUBLIC_BASE_URL` y `FROM_EMAIL` reales. `SEND_ENABLED` continúa en `false` durante la configuración. El dominio de ese remitente limita las direcciones que se pueden elegir luego desde Admin.
5. Completado: los tres secretos están cargados **en Cloudflare**, no en `.env` de Expo ni en Firebase. Para cargar o renovar la clave de envío en otra instalación:

```powershell
npx --yes wrangler@4.158.0 login
npx --yes wrangler@4.158.0 secret put RESEND_API_KEY --config email-worker/wrangler.jsonc
```

Crear la clave de Resend con nombre `ENTRE DOS`, permiso `Sending access` y restricción a `correo.sevenawesome.com`. Pegarla en la entrada protegida que solicita `secret put`, sin incluirla en el comando ni en el chat. `UNSUBSCRIBE_SECRET` ya se generó con 32 bytes aleatorios y se cargó directamente por entrada estándar; no hay copia local. No rotarlo de manera rutinaria: invalidaría enlaces de baja existentes. En una instalación nueva, generar un secreto aleatorio de al menos 32 caracteres y cargarlo con `wrangler secret put UNSUBSCRIBE_SECRET`.

La credencial de Google se validó contra el proyecto/cuenta esperados y se cargó directamente por entrada estándar desde su archivo privado, sin copiarla al proyecto ni mostrarla. La autenticación y las consultas se comprobaron sin enviar correos. Para renovar esa credencial, usar la ruta real a su archivo privado, **fuera del proyecto**:

```powershell
$mailKeyPath = 'C:\ruta-privada\cuenta-de-servicio.json'
Get-Content -Raw -LiteralPath $mailKeyPath | npx --yes wrangler@4.158.0 secret put GOOGLE_SERVICE_ACCOUNT --config email-worker/wrangler.jsonc
```

6. Ya se desplegaron reglas/índices de Firestore y el Worker inactivo. Para repetir el despliegue después de configurar los secretos, usar estos comandos. No activar Firebase Functions ni Blaze:

```powershell
npx firebase-tools@latest deploy --only firestore --project entre-dos-db
npx --yes wrangler@4.158.0 deploy --config email-worker/wrangler.jsonc
```

7. `/health` ya responde `configured: true, sending: false`. Antes de la prueba, la familia propietaria debe usar **Nosotros → Su correo de contacto → Enviar enlace de verificación**, abrir el enlace recibido y volver a **Ya confirmé mi correo**. Después configurar los textos y remitente desde Admin. Cambiar `SEND_ENABLED` a `true` y desplegar cuando se decida comenzar el envío; es un interruptor del servidor que la app no puede eludir. El primer ciclo publica el estado del servicio en Firebase. Probar primero con la familia propietaria confirmando recepción y baja antes de invitar a otras familias.

La cuenta de Firebase y sus verificaciones/recuperaciones funcionan sin estos pasos adicionales. No hacen falta contraseñas de Gmail para esta integración.

## Validación

`npm run check` comprueba tipos, lint y dominio; `npm run test:email` usa transporte simulado y reservas concurrentes; `npm run test:firebase` requiere los emuladores de Auth y Firestore. La comprobación local no envía correo real. Antes de activar el servidor faltan confirmar el correo de prueba y autorizar una prueba controlada de recepción/baja. El despliegue conserva `SEND_ENABLED=false`.
