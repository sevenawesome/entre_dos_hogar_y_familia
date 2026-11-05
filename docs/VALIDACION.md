# Validación previa a producción

## Comprobaciones realizadas en desarrollo

- TypeScript y lint sin errores.
- 69 pruebas automatizadas aprobadas: avance diario también entre niveles, estados del recorrido, validación de administración, protección de las seis funciones administrativas, guía, fechas, catálogo y avisos combinados, incluidos años bisiestos.
- Expo Doctor: 20 de 20 comprobaciones aprobadas.
- Exportación de bundles Android, iOS y web completada. Esto verifica el empaquetado; no equivale a ejecutar un binario nativo.
- Backend TypeScript compilado y sus doce funciones cargadas localmente. Las pruebas invocan los seis handlers administrativos para verificar rechazo de peticiones anónimas o de usuarios normales; las escrituras autorizadas aún requieren Firebase real o emuladores.
- Interfaz revisada en navegador de 390 × 844: registro familiar, primer reto, confirmación de participación, nota guardada, historial y siguiente reto bloqueado hasta mañana.
- Demostración conserva la familia al volver a entrar.
- Guía automática de cinco pasos recorrida hasta el final, regreso a Hoy y ayuda permanente revisados en navegador móvil de 390 × 844. Vista previa administrativa comprobada: nivel actual, final sin sucesor y nuevo nivel con 50 retos ficticios, sin publicar datos.
- Capturas con datos ficticios: `preview-nivel.jpg`, `preview-guia.jpg`, `preview-informacion.jpg`, `preview-nivel-completo.jpg` y `preview-nivel-nuevo.jpg`.
- Firebase `entre-dos-db` y el ID de Expo están preparados en los archivos de configuración. Aún no hay bloque `firebaseConfig` ni sesión local EAS: no se ha confirmado propietario/slug ni conectado el backend.
- Auditoría npm del backend: 0 vulnerabilidades. En el cliente no quedan alertas altas o críticas; `npm audit --omit=dev` informa 5 moderadas en la cadena de herramientas de Expo (`expo`, `@expo/cli`, `@expo/fingerprint`, `glob`, `minimatch`). Se conservan las versiones compatibles con SDK 58 y se deben revisar al actualizar Expo; no se aplicaron cambios mayores forzados a sus dependencias.

No se han ejecutado pruebas con Firebase real, emuladores de Firebase, dispositivos físicos, credenciales push ni envíos a tiendas. Las comprobaciones siguientes permanecen pendientes de esos entornos.

## Cuentas y datos

- [ ] Registro y recuperación de contraseña con Firebase real.
- [ ] Pareja registrada en A; acceso con la misma cuenta en B conserva familia y progreso.
- [ ] Editar hijos/apodos se refleja en ambos.
- [ ] Guardar o editar matrimonio en A actualiza la fecha y el aro en B; las cuentas anteriores sin fecha siguen funcionando.
- [ ] Guardar cumpleaños de ambos integrantes y de hijos en A actualiza edades y barras en B.
- [ ] Eliminar un cumpleaños dejando vacío el campo detiene sus saludos posteriores.
- [ ] Publicar una versión nueva del catálogo actualiza nombres y significados sin recompilar.
- [ ] Una segunda familia no puede leer ni escribir datos de la primera.
- [ ] Escritura directa de progreso o catálogo desde el cliente es rechazada.
- [ ] Completar simultáneamente en A y B produce una sola finalización.
- [ ] Sin conexión, completar muestra error y no indica éxito.
- [ ] El próximo reto se abre al día siguiente de la zona horaria familiar.
- [ ] El cuestionario se habilita tras todos los retos; conseguir el nivel requiere todas sus respuestas.
- [ ] Publicar un nivel nuevo con Admin lo muestra en ambos sin actualizar la app.
- [ ] Nivel nuevo bloqueado hasta finalizar el cuestionario del anterior.
- [ ] Finalizar el último nivel muestra celebración y conserva recuerdos; publicar otro cambia el aviso en ambos teléfonos.
- [ ] Una cuenta con custom claim `admin: true` puede configurar mensajes, guardar un borrador y publicar un nivel válido.
- [ ] Revocar el rol impide usar las funciones incluso con un token anterior.
- [ ] Borradores no aparecen a las familias; editar retos/preguntas de un nivel publicado se rechaza.
- [ ] Cambios administrativos de familia y pausa quedan auditados; las notas y respuestas no se muestran en el panel.
- [ ] La guía aparece en la primera visita de cada cuenta en cada teléfono y puede reabrirse desde Información.

## Notificaciones en Android e iOS

- [ ] Build con ID EAS válido, credenciales FCM v1/APNs y funciones desplegadas.
- [ ] Guardar horarios distintos en ambos teléfonos registra dos dispositivos.
- [ ] Con la app cerrada, llega el aviso dentro de la siguiente ventana del programador.
- [ ] Al tocar el aviso se abre Hoy.
- [ ] Si no completan el reto, se recuerda al día siguiente.
- [ ] Tras completar en A, el siguiente aviso de B corresponde al progreso compartido.
- [ ] Denegar permisos explica cómo activarlos; guardar no indica éxito.
- [ ] Pausar o cerrar sesión en A detiene sus avisos y conserva los de B.
- [ ] La pausa global y la pausa administrativa de una familia detienen sus avisos; reactivarlas conserva preferencias por teléfono.
- [ ] Tras terminar retos y cuestionario, cesan los avisos; un nivel nuevo los reactiva.
- [ ] Con todos los niveles conseguidos, el aniversario sigue enviando un saludo a ambos teléfonos en sus horarios elegidos.
- [ ] El aviso del aniversario incluye el reto si hay uno pendiente; no incluye notas privadas.
- [ ] Saludo registrado por dispositivo y aniversario; pausar avisos lo desactiva también.
- [ ] Dos cumpleaños simultáneos incluyen ambas personas; aniversario y reto también permanecen en el aviso cuando corresponden.
- [ ] Revisar logs de recibos y eliminación de tokens inválidos.
- [ ] Comprobar comportamiento al cambiar zona horaria del teléfono y al reinstalar.

## Tiendas y dispositivos

- [ ] Revisar teclado, texto grande, lector de pantalla, teléfono pequeño y tablet.
- [ ] Probar iconos, splash y apertura desde push en builds release.
- [ ] Revisar política de privacidad pública, contacto y declaraciones de datos.
- [ ] Eliminación requiere sesión reciente; borra Auth y datos en ambos dispositivos.
- [ ] Usuarios de otra familia conservan sus datos después de esa eliminación.
- [ ] Confirmar identificadores de app, versión y cuentas propietarias antes de enviar.

Estas comprobaciones requieren los proyectos y teléfonos del propietario. No se consideran realizadas solo por aprobar typecheck, lint o las pruebas locales.
