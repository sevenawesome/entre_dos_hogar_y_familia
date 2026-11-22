# Borrado definitivo y moderación

Actualización del 22 de noviembre de 2026. Implementación para la versión de prueba de Amor que permanece. No reemplaza las pruebas de un binario instalado ni completa por sí sola la ficha de las tiendas.

## Borrado de cuentas

- **Nosotros → Cuenta y acceso → Eliminar cuenta y datos** solicita la contraseña actual y la frase `ELIMINAR MI CUENTA`. También está disponible sin completar el registro. El servidor exige autenticación reciente de cinco minutos y usa exclusivamente el UID del token.
- **Desactivar** sigue siendo independiente y recuperable. No se convierte una petición de borrado definitivo en desactivación.
- El propietario y los administradores se conservan durante los reinicios administrativos. Un administrador puede solicitar expresamente borrar su propia cuenta. El propietario debe elegir antes otro administrador activo y verificado; el servidor transfiere la propiedad de forma atómica antes de comenzar su borrado.
- Se retira el perfil público, se elimina Firebase Auth y se limpian familia, fotos, retratos individuales, progreso, notas/respuestas, recorrido, dispositivos, bandejas/adjuntos, preferencias, colas de correo y felicitaciones enviadas/recibidas, incluidas sus copias en otras bandejas. También se eliminan consentimientos, aprobaciones, reportes relacionados y las relaciones y espejos de bloqueo.
- Una marca de borrado impide recrear datos con una sesión antigua. La limpieza recorre páginas acotadas, utiliza una reserva temporal y se puede repetir sin duplicar efectos. Las solicitudes propias continúan aunque el propietario no esté conectado.
- Los registros técnicos mínimos conservan UID, estado, fechas y auditoría; no conservan fotos ni contenido de los recuerdos. Las miniaturas y temporales de cámara/compresión se limpian en el teléfono conectado. No se borran originales de la galería ni copias que ya existan fuera de la app. Un teléfono sin conexión necesita sincronizar para cerrar su sesión y retirar avisos locales.
- Recurso web público: `https://entre-dos-correo.sevenawesome-srl.workers.dev/eliminar-cuenta`. Permite iniciar una solicitud por correo sin reinstalar la app. El equipo debe verificar la titularidad y tramitarla; no se envió ninguna solicitud real durante las comprobaciones.

## Moderar Comunidad

1. El propietario entra en **Administración → Moderar Comunidad**. Para delegar esta tarea, concede **Revisar perfiles, reportes y suspensiones de Comunidad** desde Administradores. Los permisos antiguos no reciben automáticamente este nuevo permiso.
2. La familia acepta las normas en Comunidad → Compartir. Los perfiles nuevos, existentes sin revisión y los cambios de nombres/fotos quedan pendientes; se requiere correo verificado para aprobarlos. Sus fotos privadas siguen disponibles en Nosotros.
3. El moderador abre la vista previa, amplía todas las fotos y revisa también nombres y retratos/cumpleaños compartidos. Confirma su revisión antes de aprobar. Si el contenido cambió, debe actualizar la vista previa. La aprobación guarda una copia de la identidad pública autorizada; las reglas impiden sustituirla manteniendo el estado aprobado.
4. Reportes muestra únicamente el contenido público o la felicitación señalada, junto al motivo. No permite explorar notas, cuestionarios, fotos individuales privadas ni otras felicitaciones. El moderador documenta el resultado y cierra o retira el contenido. Al resolver, se elimina la copia de contenido del reporte y se conserva el resultado técnico.
5. Retirar oculta el perfil o sustituye la felicitación y su copia en la bandeja por un aviso. Suspender impide publicar y enviar nuevas felicitaciones en Comunidad; no borra el progreso ni deshabilita toda la cuenta. Levantar la suspensión devuelve el perfil a revisión.

El equipo debe revisar habitualmente el panel, procurando atender reportes dentro de 24 horas. Este es un proceso humano y necesita responsables; no se contrató ningún servicio de moderación de pago. El contacto aparece en Comunidad → Compartir y usa el correo configurado en Administración, con `sevenawesome.srl@gmail.com` como respaldo.

## Reportes y bloqueos

- Cada perfil/celebración y cada felicitación recibida ofrece **Reportar o bloquear**. Se admite un reporte por cuenta, contenido y día para evitar duplicados entre teléfonos.
- Bloquear oculta el perfil y las felicitaciones en la cuenta que bloquea e impide nuevas felicitaciones entre ambas familias. Cada familia conserva su propio bloqueo; desbloquear una parte no anula el de la otra. La lista propia se gestiona en Comunidad → Compartir.
- El servicio aplica el bloqueo y verifica la participación aprobada de ambas familias. Las escrituras usan versiones para impedir que una felicitación en curso se guarde tras un bloqueo, retirada, desactivación o marca de borrado.
- Los perfiles públicos se consultan por el servicio paginado y solo se devuelven perfiles visibles y aprobados. Las reglas impiden listar Comunidad directamente, falsificar aprobaciones, modificar espejos de bloqueo o escribir reportes desde el cliente.
- Un filtro inicial de texto rechaza enlaces y expresiones ofensivas conocidas; no sustituye los reportes ni la revisión humana de fotos y nombres.

## Operación y despliegue

El Worker usa dos cron: correo cada diez minutos y mantenimiento cinco minutos después. Una invocación de mantenimiento procesa como máximo una página y alterna los tipos de tareas para no exceder las 50 subsolicitudes externas de Workers Free. Los borrados propios pendientes se ordenan por su último intento para permitir avanzar a otras cuentas.

Los índices de Comunidad y selfDeletionJobs deben estar listos antes del Worker. Publicar después las reglas y la actualización móvil. Las versiones antiguas que listaban Comunidad directamente necesitan actualizarse. No aprobar automáticamente perfiles existentes: la familia debe aceptar las normas y el equipo revisarlos.

Comprobaciones realizadas con datos ficticios: tipos, lint, 135 pruebas de dominio, 74 del servicio y 65 de reglas/Authentication; exportación de iOS/Android/web y revisión visual móvil de vista previa, confirmación de borrado y reporte. No se borraron cuentas reales ni se enviaron mensajes reales para probar estas funciones. Queda comprobar cámara, caché nativa, cierre de sesión en el segundo teléfono y los flujos entre dos cuentas ficticias en un binario instalado.
