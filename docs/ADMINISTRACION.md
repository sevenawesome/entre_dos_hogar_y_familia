# Administración de ENTRE DOS

El panel usa Firebase Authentication y funciones del servidor. Los cambios de contenido se guardan en Firestore y llegan a las apps suscritas sin publicar otra versión. Requiere configurar Firebase, desplegar reglas y funciones y cargar el catálogo antes de usarlo en producción.

## Activar la cuenta administradora

1. Con Firebase conectado, registra tu cuenta en ENTRE DOS con el correo elegido.
2. En la computadora del propietario, autentica Application Default Credentials con `gcloud auth application-default login`. Alternativamente usa credenciales privadas fuera del repositorio. La sesión de Firebase CLI para desplegar y las credenciales ADC para scripts son independientes.
3. Desde la raíz del proyecto:

```powershell
$env:GCLOUD_PROJECT = 'entre-dos-db'
npm --prefix functions run admin -- tu-correo@example.com grant
```

4. Cierra sesión y vuelve a entrar en la app. En **Información → Administración** aparecerá el acceso.

El script exige que la cuenta exista. Asigna el custom claim booleano `admin: true` conservando los demás claims. No hay promoción por correo, campo de perfil ni botón en el cliente. Cada función administrativa verifica el claim del token y el permiso actual en Authentication. Para revocarlo:

```powershell
npm --prefix functions run admin -- tu-correo@example.com revoke
```

No guardes claves Admin ni archivos de cuenta de servicio en el repositorio o en variables `EXPO_PUBLIC_*`.

## Aplicación

Permite editar el aviso general, el título y mensaje al conseguir todos los niveles, el título para nuevos niveles, el contacto de soporte y la pausa global de notificaciones. La pausa conserva las preferencias de cada teléfono. No bloquea completar retos ni borra avances.

Las vistas **Nivel actual**, **Sin más niveles** y **Nivel nuevo** muestran ejemplos con los textos del formulario. No alteran progreso ni publican contenido. En demostración, todo el panel es una vista previa: guardar y buscar familias están deshabilitados.

`config/app` contiene la configuración pública; todas las cuentas autenticadas pueden leerla y solo el servidor puede escribirla. Usa un número de versión para evitar sobrescribir cambios de otro administrador. Si aparece un conflicto, recarga y revisa antes de guardar. `npm run seed` crea los valores iniciales solo cuando no existen.

## Niveles

En **Niveles**, selecciona uno o prepara un borrador nuevo. El editor JSON sirve para pegar un catálogo completo, incluidos 50 o más retos. Cada nivel tiene `id`, `order`, `title`, `subtitle`, `description`, `published`, `prerequisiteId`, `challenges` y `questions`. Usa `content/level-1.json` como referencia de formato.

- Primer nivel: `order: 1`, `prerequisiteId: null`.
- Siguientes: un orden único y el ID de un nivel anterior ya publicado como prerrequisito.
- Entre 1 y 200 retos, ordenados consecutivamente desde 1; entre 1 y 30 preguntas finales.
- Los identificadores son estables y únicos dentro del nivel. Los retos incluyen título, actividad, reflexión, etapa y minutos.
- Empieza con `published: false`. Valida, revisa el contenido y guarda el borrador.
- Para publicarlo, cambia a `published: true`, valida y marca la confirmación de publicación.

Las familias solo reciben niveles publicados. Un nivel nuevo desbloqueado y todavía sin comenzar se anuncia con color destacado y una llamada para descubrirlo. Quien no consiguió su prerrequisito lo ve bloqueado en Nuestro camino. Terminar retos y cuestionario consigue el nivel; si no hay otro publicado, aparece la celebración con acceso a sus recuerdos. No se inventa ni se muestra un nivel vacío como disponible.

Un nivel publicado conserva retos, preguntas, orden, ID y prerrequisito para proteger el historial. Puedes corregir título, subtítulo y descripción desde el panel. Para otro recorrido crea un nivel nuevo. También existe el publicador por CLI descrito en el README, que no sobrescribe documentos existentes.

## Familias

Busca por correo exacto de la cuenta o por UID de Firebase Authentication. Puedes consultar el número de retos completados y niveles conseguidos, editar nombres/apodos, fechas y miembros, y pausar o reanudar sus recordatorios. La zona horaria familiar original se conserva para proteger el límite diario. Las notas íntimas y respuestas del cuestionario no forman parte de la respuesta del panel.

Los controles están en `familyControls/{uid}`. La familia puede leer su pausa, pero no modificarla directamente. Sus integrantes conservan además la pausa propia de cada teléfono. El panel no permite cambiar contraseñas, asignar administradores, borrar cuentas ajenas ni falsificar progreso.

## Auditoría y límites

`adminAudit` registra actor, acción, destino y fecha para cambios de configuración, niveles, perfiles, pausas, búsquedas y asignación/revocación del rol por CLI. No copia notas o respuestas. Se consulta desde la consola Firebase por personal con acceso al proyecto; la app no puede editarlo.

El propietario del proyecto conserva las facultades del Admin SDK y de la consola Firebase. El panel limita las acciones dentro de la app; no restringe a los propietarios de infraestructura. Revisa y concede acceso al proyecto únicamente a las personas responsables.

Las funciones administrativas y el envío de notificaciones aún deben verificarse con el proyecto real y ambos teléfonos. La compilación local y las pruebas de rechazo de permisos no sustituyen esas comprobaciones.
