# Correos opcionales y permisos administrativos

Firebase continúa en Spark. El usuario creó las cuentas de Resend/Cloudflare y verificó `correo.sevenawesome.com` en Resend. El Worker está publicado en `https://entre-dos-correo.sevenawesome-srl.workers.dev`, **con el envío desactivado**. Su secreto de baja ya está guardado en Cloudflare, sin copiarlo al repositorio ni mostrar su valor. Faltan la clave de envío de Resend y la cuenta de servicio de Google. No se han enviado correos personalizados reales de prueba.

## Centro de configuración

En **Admin → Abrir centro de configuración**:

- Aplicación: avisos, mensajes de cierre/nuevos niveles, soporte y pausa de recordatorios.
- Correos: nombre/remitente y dirección para respuestas, pausa, resúmenes automáticos, mensajes administrativos, límites y cuatro plantillas de texto con variables. Las claves del proveedor no aparecen ni se guardan en Firebase o Expo.
- Niveles: borradores, publicación, retos, reflexión final y catálogo de bodas.
- Familias: búsqueda, consulta y edición según el permiso concedido. La fecha de matrimonio sigue siendo obligatoria.
- Permisos: buscar una cuenta registrada y elegir sus accesos. Los cambios se auditan y las reglas los verifican en cada operación.

El contacto inicial es `sevenawesome.srl@gmail.com`. Puede cambiarse desde Aplicación; la dirección para respuestas se cambia en Correos.

| Permiso | Acceso |
| --- | --- |
| `families.view` | Perfiles familiares, fechas/celebraciones y resúmenes de progreso; las notas, cuestionarios y fotos individuales privadas no se muestran. |
| `families.edit` | Editar perfiles y pausar recordatorios; requiere consultar familias. |
| `messages.send` | Escribir a la bandeja y, con consentimiento, encolar correo; requiere consultar familias. |
| `content.manage` | Gestionar niveles, borradores y catálogo de bodas. |
| `settings.manage` | Cambiar la configuración del producto y del correo. |
| `roles.manage` | Gestionar otros administradores; requiere consultar familias y no permite conceder permisos superiores a los propios ni modificar una cuenta con permisos superiores. |

El propietario conserva todos los accesos y su rol no puede cambiarse desde la app. Nadie cambia su propio permiso desde el panel. Los administradores anteriores sin lista explícita conservan sus permisos hasta que el propietario los revise. Los nuevos se crean con permisos explícitos; por defecto solo consulta de familias. Un permiso se aplica a toda la cuenta familiar compartida.

## Experiencia de la familia

**Nosotros → También por correo** permite elegir retos/cierre del nivel, celebraciones y mensajes del equipo, con horario aproximado. Todas las opciones empiezan apagadas y requieren correo verificado y servicio habilitado. Los recordatorios del teléfono continúan independientes.

El resumen diario recuerda el mismo reto hasta completarlo, respeta las 24 horas desde el completado y deja de recordar retos cuando no quedan niveles. Cumpleaños y aniversario se agrupan en el mismo resumen; no se envían fechas completas de nacimiento, notas, respuestas ni fotos. Los mensajes administrativos van por separado si se autorizan.

Cada correo incluye un enlace de baja. Abrirlo muestra una confirmación; un POST firmado desactiva los correos opcionales. También admite la baja de un clic del cliente de correo. Los enlaces caducan a los 90 días; siempre puede usarse Nosotros. Darse de baja no afecta los correos de acceso de Firebase.

## Qué falta para activarlo

1. Completado por el usuario: cuentas gratuitas en [Resend](https://resend.com/) y [Cloudflare](https://dash.cloudflare.com/), y autorización de Wrangler.
2. Completado: `correo.sevenawesome.com` verificado en Resend, con DNS en GoDaddy. Remitente configurado: `avisos@correo.sevenawesome.com`. **No se puede verificar gmail.com**: el Gmail indicado sirve para recibir respuestas, soporte y registrar las cuentas.
3. Crear una cuenta de servicio exclusiva para este proceso en el proyecto `entre-dos-db`, con `roles/datastore.user` y `roles/firebaseauth.viewer`. No usar Owner/Editor. Su clave se mantiene fuera del repositorio y de este chat. La cuenta puede consultar datos de Firestore por IAM; el código solo necesita familia/fechas, resúmenes y metadatos de cierre, catálogo, preferencias, roles y cola, sin leer notas/respuestas ni fotos.
4. Completado: `email-worker/wrangler.jsonc` fija la cuenta Cloudflare autorizada, proyecto, `PUBLIC_BASE_URL` y `FROM_EMAIL` reales. `SEND_ENABLED` continúa en `false` durante la configuración. El dominio de ese remitente limita las direcciones que se pueden elegir luego desde Admin.
5. Cargar los secretos **en Cloudflare**, no en `.env` de Expo ni en Firebase:

```powershell
npx --yes wrangler@4.158.0 login
npx --yes wrangler@4.158.0 secret put RESEND_API_KEY --config email-worker/wrangler.jsonc
```

Crear la clave de Resend con nombre `ENTRE DOS`, permiso `Sending access` y restricción a `correo.sevenawesome.com`. Pegarla en la entrada protegida que solicita `secret put`, sin incluirla en el comando ni en el chat. `UNSUBSCRIBE_SECRET` ya se generó con 32 bytes aleatorios y se cargó directamente por entrada estándar; no hay copia local. No rotarlo de manera rutinaria: invalidaría enlaces de baja existentes. En una instalación nueva, generar un secreto aleatorio de al menos 32 caracteres y cargarlo con `wrangler secret put UNSUBSCRIBE_SECRET`.

Para la cuenta de servicio, usar la ruta real a su archivo privado, **fuera del proyecto**:

```powershell
$mailKeyPath = 'C:\ruta-privada\cuenta-de-servicio.json'
Get-Content -Raw -LiteralPath $mailKeyPath | npx --yes wrangler@4.158.0 secret put GOOGLE_SERVICE_ACCOUNT --config email-worker/wrangler.jsonc
```

6. Ya se desplegaron reglas/índices de Firestore y el Worker inactivo. Para repetir el despliegue después de configurar los secretos, usar estos comandos. No activar Firebase Functions ni Blaze:

```powershell
npx firebase-tools@latest deploy --only firestore --project entre-dos-db
npx --yes wrangler@4.158.0 deploy --config email-worker/wrangler.jsonc
```

7. Revisar `/health` del Worker. En el primer despliegue respondió `configured: false, sending: false`, coherente con las credenciales pendientes. Configurar los textos y remitente desde Admin. Cambiar `SEND_ENABLED` a `true` y desplegar cuando se decida comenzar el envío; es un interruptor del servidor que la app no puede eludir. El primer ciclo publica el estado del servicio en Firebase. Probar primero con la familia propietaria y su consentimiento, confirmando recepción y baja antes de invitar a otras familias.

La cuenta de Firebase y sus verificaciones/recuperaciones funcionan sin estos pasos adicionales. No hacen falta contraseñas de Gmail para esta integración.

## Límites y entrega

- Resend ofrece una [cuota gratuita](https://resend.com/pricing). Esta implementación limita por defecto a 90 reservas diarias y 2700 mensuales para dejar margen; desde Admin se pueden reducir esos límites, sin superar esos máximos. Los presupuestos son compartidos, no por familia.
- Un Worker con [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) revisa trabajo pendiente cada diez minutos. Procesa una entrega por ciclo y alterna resúmenes/mensajes; no es una entrega inmediata ni se garantiza que todos reciban correo si se llena la cuota. El plan Free también tiene [límites propios](https://developers.cloudflare.com/workers/platform/limits/).
- No se recorren todas las familias: se consultan preferencias vencidas/colas con límites e índices. Las lecturas y escrituras consumen cuota de Firestore Spark.
- Los presupuestos se reservan de manera atómica. Reservas fallidas no se devuelven automáticamente: el cálculo es conservador.
- Los reintentos conservan el mismo contenido y clave de idempotencia. Solo se reintenta dentro de 23 horas; un resultado ambiguo más antiguo queda para revisión y no vuelve a enviarse automáticamente. Los mensajes de la cola que superan dos días se omiten.
- Se comprueban dirección verificada, consentimiento/versión, eliminación de cuenta y permiso vigente del emisor. Para un resumen en reintento también se comprueban avance, perfil y fecha local, evitando recordar un reto que ya se completó.
- `accepted` significa aceptado por Resend, **no entregado ni leído**. No se ha implementado un webhook de rebotes/entregas. El contenido del trabajo se elimina al finalizar; la eliminación de cuenta limpia preferencias, cola y trabajos propios.
- No se guardan claves de Resend/Google en Expo ni en documentos públicos. El endpoint público solo ofrece estado y baja firmada; no acepta peticiones arbitrarias de envío.

## Verificación sin correo real

```powershell
npm run check
npm run test:email
npx firebase-tools@latest emulators:exec --only firestore,auth --project demo-entre-dos "npm run test:firebase"
```

`test:email` empaqueta el Worker en modo seco y usa repositorio/transporte locales de prueba; no llama Resend ni Google con credenciales reales. El empaquetado local no equivale a verificar ejecución/CPU/entrega en la infraestructura de Cloudflare: esa comprobación queda para activar las cuentas.
