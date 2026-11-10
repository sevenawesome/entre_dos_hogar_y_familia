# Validación de Amor que permanece · Firebase Spark

Verificado el 10 de noviembre de 2026. Las pruebas automatizadas usan proyectos demo locales y transporte de correo simulado; la comprobación remota es de lectura. La comprobación remota confirmó Auth y las tres consultas indexadas de eventos/trabajos/cola, con el nuevo índice listo. El correo propietario ya figura verificado. El despliegue mantiene el envío de correo real apagado. No se modificaron roles reales ni se enviaron mensajes a familias.

## Comprobaciones actuales

- `npm run check`: TypeScript y lint sin errores; 107 pruebas de dominio/regresión aprobadas. Incluyen catálogo original de 30 retos, secuencia/niveles, recordatorios, fechas, fotos/privacidad y siete permisos administrativos. Se retiraron las pruebas del resumen diario de correo junto con esa funcionalidad; se sustituyeron por eventos transaccionales.
- Firestore/Auth Emulator: 54 pruebas aprobadas (51 de reglas y tres de acceso). Cubren familia/resumen atómicos, matrimonio obligatorio, espera de 24 horas, cuestionario, permisos efectivos, aislamiento de notas, comunidad, fotos, bandeja y eliminación. Nuevos casos: control administrativo de correo, imposibilidad de anular una baja, separación de permisos de ambos canales, cola sin copia en bandeja, evento de bienvenida ligado al primer registro, evento único ligado al cierre y concesión/revocación de los siete permisos.
- Worker: 35 pruebas aprobadas, sin red hacia Resend. Cubren verificación pendiente sin cuota, bienvenida única con y sin documento de recepción, nivel solo tras el cuestionario, lecturas con máscara sin respuestas, ausencia de resúmenes diarios, pausas independientes, permisos vigentes, bajas firmadas, cuotas concurrentes, reintentos idénticos dentro de 23 horas, direcciones de Auth, remitente verificado y estado público sin secretos.
- Exportación de producción Android, iOS y web aprobada con Expo SDK 58. Comprueba empaquetado; no equivale a probar binarios nativos ni genera firma/publicación en las tiendas.
- Vista móvil web 390 × 844 con familias ficticias: ocho secciones administrativas, siete permisos en español, búsqueda y revisión de correo, ajustes con dos plantillas y categorías limitadas, notificaciones independientes, Fechas, Niveles y Configuración. Nosotros conserva seguridad y avisos del teléfono sin controles de correo. Se corrigió un espacio JSX fuera de Text detectado en esta revisión. La nueva identidad visual y sus capturas se documentan en [Identidad gráfica](IDENTIDAD_GRAFICA.md).

## Servicios externos

Firestore tiene desplegadas las reglas actuales y el índice `mailEvents(state,nextAttemptAt)`. El Worker `entre-dos-correo` está actualizado, con cron cada diez minutos y `SEND_ENABLED=false`. Sus tres secretos siguen solo en Cloudflare. La cuenta real propietaria conserva el rol `owner`; no se alteró su documento.

El dominio `correo.sevenawesome.com` está verificado en Resend; DNS en GoDaddy. La cuenta dedicada de Google conserva Usuario de Cloud Datastore y Visualizador de Firebase Authentication, y agrega un rol personalizado con el único permiso firebaseauth.users.delete para la eliminación solicitada. El servicio usa IAM, mientras que los clientes usan las reglas. No se activó Blaze, Storage ni Cloud Functions. Procedimiento y política: [correo y permisos](CORREOS_Y_PERMISOS.md).

## Pendiente antes de publicar

Autorizar una prueba controlada de recepción/baja antes de activar el Worker. El correo propietario ya está verificado; las nuevas familias confirman su dirección desde Nosotros → Su correo de contacto. No se ha probado entrega real, spam, rebotes ni lectura; accepted solo indica aceptación del proveedor. Comprobar la app en iPhone y Android físicos, con dos dispositivos, permisos y notificaciones. La automatización local no sustituye estas pruebas. Las cuentas de desarrollador y requisitos de tiendas son independientes de Firebase Spark.

## Identidad gráfica Amor que permanece

Se conservó el logo transparente suministrado y se prepararon iconos de tienda, capas adaptables y máscara blanca para notificaciones. El icono de tienda es PNG RGB de 1024 × 1024; la máscara es PNG con alfa de 96 × 96. La escena creativa está incluida localmente en JPEG de aproximadamente 228 KB y acompaña el arranque de la cuenta, visible al menos 1,2 segundos. Se revisaron bienvenida, Hoy, aniversario y Nosotros en pantalla móvil web; la introspección de Expo confirmó nombre, recursos, splash y largeIcon. Los identificadores técnicos y datos siguen compatibles. Se actualizaron solo las referencias al nombre anterior en el remitente y las dos plantillas guardadas, conservando límites y pausa; el Worker actualizado mantiene SEND_ENABLED=false y no se enviaron correos. El arranque y los iconos instalados requieren validar una nueva compilación nativa de preview o producción; Expo Go no reproduce esa parte completamente.

## Panel administrativo y firma · 10 de noviembre

Admin tiene un espacio visual propio: encabezado azul, panel de ocho módulos, navegación familiar oculta y salida explícita a la app. Cada módulo tiene una guía desplegable con tres pasos y una nota sobre su alcance. Se comprobó la navegación, las ocho guías, la vista previa y la recarga del texto con datos ficticios en 390 × 844.

La firma se guarda en `config/branding`, separada de la configuración privada. Antes de la corrección, las reglas publicadas no incluían esa ruta. Se publicaron las reglas y se verificó su versión remota. El guardado requiere `settings.manage`, una auditoría atómica y la versión esperada; las pruebas incluyen creación, actualización y rechazo de sobrescritura desactualizada mediante transacción. La pantalla sigue la configuración en vivo hasta que comienza la edición y muestra confirmación visible tras guardar. No se cambió la firma ni ningún rol real para hacer las pruebas.

Las fotos de Hoy usan el mismo marco adaptable que el logo, sin deformar ninguno. Capturas: `preview-foto-logo-iguales.jpg`, `preview-admin-panel.jpg` y `preview-admin-ayuda.jpg`. El envío real de correos sigue apagado.

## Ajustes de apertura y eliminación administrativa · 10 de noviembre

Verificados TypeScript y lint; 107 pruebas de dominio, 54 de Firestore/Auth y 35 del Worker. Los quince casos nuevos del servicio de cuentas cubren JWT firmado/tamper/revocación, propietario vigente, permiso IAM previo, vista previa/confirmación, cuentas administrativas protegidas, cambios de rol concurrentes, reintentos, limpieza paginada y eliminación de contenido privado sin leerlo. Las eliminaciones se ejecutan exclusivamente en repositorios simulados; las pruebas de reglas y Auth usan emuladores.

La comprobación remota de solo lectura confirmó listado Auth con campos limitados, consultas con máscara, permiso de eliminación dedicado y cero procesos de borrado en cola. Se publicaron la protección contra otorgar roles a cuentas en eliminación y el Worker con `ADMIN_ACCOUNTS_ENABLED=true`. El rol IAM personalizado agrega únicamente `firebaseauth.users.delete` a la cuenta de servicio existente; no se otorgó Firebase Authentication Admin ni se alteraron roles de usuarios de la app. No se eliminó ninguna cuenta real ni se enviaron correos.

La cabecera iguala la fotografía a la altura visible del logo 2:1 y acerca la firma. La apertura muestra la escena de pareja y mar a pantalla completa; la vista previa usa dimensiones explícitas para evitar el tamaño intrínseco de las imágenes en web. En Expo Go su pantalla inicial propia puede seguir mostrando un icono antes de entrar a la app. El arranque nativo definitivo requiere una compilación de preview/producción.

## Firma centrada, acento de amor y fotos

TypeScript y lint sin errores; 107 pruebas de dominio y 36 del Worker aprobadas en esta revisión. El nuevo caso recorre los modos individual y masivo con foto familiar, fotos de ambos cónyuges e hijos y copias públicas de Comunidad; comprueba su eliminación junto con notas y cuestionarios, conserva las familias excluidas/administrativas y verifica que los procesos y auditorías no copian esas fotos ni respuestas. Solo se utilizaron repositorios simulados; no se borraron cuentas reales.

Se revisaron Hoy y el detalle del reto en 390 × 844. En 390 y 320 de ancho se midieron márgenes visuales iguales (diferencia inferior a 0,01 px), firma centrada y ausencia de desbordamiento horizontal. Se conservó la apertura existente y se documentó la limitación del icono de carga propio de Expo Go. El rojo vino se limita a detalles de amor y acciones del reto.
