# Administración con Firebase Spark

La pestaña Admin aparece para `roles/{uid}.role` igual a `owner` o `admin`. Las operaciones usan el SDK de Firestore desde la app, transacciones/lotes y reglas; no hay Cloud Functions ni facturación Blaze.

## Primera cuenta propietaria

Después de desplegar `firestore.rules` y los índices con Firebase CLI, registra la cuenta y familia desde ENTRE DOS. Copia su UID desde Firebase Authentication. Como propietario del proyecto, crea en la consola el documento `roles/UID` con el campo `role` de tipo string y valor `owner`. La app puede leer su propio permiso aun cuando ese documento todavía no existe y recibirá el cambio por suscripción.

Esta asignación se realiza fuera de la app para impedir que cualquier usuario se dé permisos. El correo por sí solo no concede acceso. Un propietario puede recuperarlo desde la consola o con el script ADC:

```powershell
$env:GCLOUD_PROJECT = 'entre-dos-db'
npm --prefix functions run admin -- tu-correo@example.com owner
```

El script necesita una cuenta Auth existente y credenciales del propietario, nunca incluidas en el cliente. `grant` asigna admin y `revoke` asigna member. No se usan custom claims para autorizar la app actual: las reglas consultan el rol de Firestore en cada operación.

## Acompañamiento

El panel carga 20 familias por página, con nombre, integrantes y resumen de retos/niveles. El progreso administrativo se confirma en la misma transacción que el reto; no se deriva de notas ni de cuestionarios visibles al administrador. Las cifras de cabecera corresponden a las familias cargadas, no al total de toda la base.

Celebraciones muestra aniversarios y cumpleaños de los próximos 30 días de esa página, incluidos hijos si su familia registró esas fechas. Acompañamiento identifica siete días o más sin completar desde el último avance o el registro inicial, mientras queden niveles publicados por conseguir. No penaliza a las familias ni publica una clasificación.

## Mensajes dirigidos

Desde una familia o celebración, prepara título y mensaje y envíalo a su bandeja. Se guarda en `families/{uid}/inbox`; solo la cuenta destinataria puede leerlo. No hay envío a números o correos externos.

La familia recibe el mensaje al abrir/sincronizar. Con recordatorios y permisos habilitados, puede presentarse un aviso local. **Esta versión sin servidor no envía push remoto inmediato con la app cerrada.** El panel lo explica antes de enviar y confirma solo el guardado, no la entrega o lectura. Nunca se incluye una credencial Expo privada en la app.

## Administradores

En Administradores selecciona otra cuenta registrada y revisa la concesión o retirada. El diálogo explica el acceso y exige marcar la confirmación. El cambio y su auditoría se escriben atómicamente. Nadie puede modificar su propio rol ni el de un propietario. La revocación bloquea las siguientes operaciones según las reglas, aun si la interfaz de otro dispositivo todavía no actualizó el tab. No revoca copias que una persona hubiera visto o guardado antes.

## Configuración, niveles y datos familiares

El botón Configurar mensajes, niveles y perfiles abre la herramienta completa:

- Aplicación: aviso general, cierre del recorrido, anuncio de nuevo nivel, contacto de soporte y pausa global. El número de versión evita sobrescribir cambios de otro administrador.
- Niveles: borradores, JSON de capítulos con 1–200 retos y 1–30 preguntas, validación, confirmación y publicación. Los publicados conservan retos, preguntas, orden y prerrequisito; las correcciones de presentación sí se permiten.
- Familias: búsqueda exacta por correo del perfil registrado o UID, edición de nombres y fechas y pausa familiar. La zona horaria original se conserva.

Para la primera carga pulsa Preparar los 30 retos originales del nivel 1, valida y confirma la publicación. Cargar catálogo inicial de bodas crea el documento solo si no existe, conservando cambios posteriores. No hace falta instalar gcloud para esas acciones; los scripts ADC son una alternativa del propietario.

## Comunidad y fotos

Cada familia decide si participa. El alias y foto solo son públicos al participar, con permisos separados para fecha de matrimonio y contadores. Las fechas de cumpleaños y los datos de hijos nunca pasan al documento comunitario. La miniatura se limita a unos 32 KB; el original no se sube. No se usa Firebase Storage.

## Auditoría y límites

`adminAudit` registra actor, acción, destino y fecha de configuración, niveles, ediciones de perfil, pausas, mensajes y permisos. No copia notas ni respuestas. Sus registros son inmutables desde la app; el propietario de Firebase mantiene sus permisos de infraestructura. La asignación inicial desde la consola es una operación del propietario fuera de este flujo.

Las pausas y cambios del catálogo llegan al sincronizar; no cancelan notificaciones locales de un teléfono que permanece cerrado. Las pruebas de reglas usan un emulador demo aislado. Sigue pendiente probar estos flujos con las cuentas reales y ambos teléfonos.
