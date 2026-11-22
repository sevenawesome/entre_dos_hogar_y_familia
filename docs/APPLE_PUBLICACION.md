# Primera publicación de iOS

Preparación iniciada el 20 de noviembre de 2026. El titular confirmó que Apple Developer está activo y que puede entrar a App Store Connect. No se ha presentado una versión pública ni generado todavía una compilación de iOS.

## Estado comprobado el 22 de noviembre de 2026

- Expo reconoce al propietario del proyecto y la consulta de compilaciones iOS devuelve una lista vacía.
- El intento de compilación de producción cargó las ocho variables remotas y creó el canal y la rama production. También inicializó el número de compilación remoto en 1.
- La compilación se detuvo antes de subir el proyecto: no existen credenciales de firma configuradas. EAS pide ejecutar el mismo comando en modo interactivo. No hay un IPA generado ni una subida a Apple pendiente de procesamiento.
- El siguiente paso de firma necesita que el titular introduzca su contraseña y segundo factor directamente en su terminal. No deben enviarse por chat ni guardarse en archivos del repositorio.
- Tipos, lint, las 132 pruebas de la app y las 20 comprobaciones de Expo Doctor pasaron en esta revisión.

La firma permite preparar la prueba en TestFlight; no resuelve los pendientes de App Review enumerados más abajo.

## Producción en Expo

Proyecto: @sevenawesomes-team/entre-dos-by-departamento-de-hogar-y-familia. Bundle ID: com.sevenawesome.entredos. Nombre visible: Amor que permanece. El perfil production usa distribution=store, environment=production, channel=production y EXPO_UPDATE_TARGET=native, conservando fingerprint y autoIncrement. Los ocho valores copiados a Expo production son exclusivamente identificadores públicos de Firebase/EAS y el selector native. Los secretos de Resend/Google permanecen en Cloudflare.

## Firma y primer build

La primera firma necesita que el titular inicie sesión en Apple desde su terminal. No enviar contraseña, código de verificación, certificado o clave privada por chat. La cuenta Apple es independiente de la cuenta Expo. La identidad de Apple queda solo en el borrador local ignorado, no en este documento ni en eas.json.

Ejecutar desde la carpeta del proyecto:

```powershell
npx --yes eas-cli@latest build --platform ios --profile production
```

Elegir el equipo Apple correcto. Revisar personalmente las preguntas de firma/certificados. Conservar el enlace de build que devuelve Expo. El inicio de sesión y el segundo factor de Apple debe completarlos el titular directamente en la terminal.

## De la compilación a TestFlight

Crear en App Store Connect una app iOS con el mismo Bundle ID, el nombre Amor que permanece, idioma principal español y SKU amorquepermanece-ios. Si el identificador todavía no aparece, terminar primero el registro/firma desde EAS. Conservar el Apple ID numérico de la ficha; se añadirá como submit.production.ios.ascAppId. No inventar el Team ID ni el Apple ID numérico.

Tras un build correcto:

```powershell
npx --yes eas-cli@latest submit --platform ios --profile production
```

Subir a App Store Connect deja el binario para procesamiento y TestFlight; no solicita por sí solo la revisión pública. Primero validar fotos/cámara, avisos locales y toque de notificaciones, sincronización con dos teléfonos, recuperación y cierre de sesión en el binario instalado. No usar imágenes ilustrativas como si fueran capturas reales para la ficha.

## Pendientes antes de App Review público

- Eliminar definitivamente la cuenta desde la app: mantener Desactivar como opción recuperable, pero agregar solicitud de borrado real con confirmación y limpieza de fotos/datos. Preservar la protección del propietario durante reinicios administrativos; resolver por separado la salida/transferencia del titular.
- Comunidad: normas y aceptación, reporte de perfiles/fotos/mensajes, bloqueo de remitentes aplicado también en el servicio y revisión/retiro de contenido por administradores. No ocultar estas funciones a Apple ni asegurar que están listas.
- Confirmar responsable, país y correo público de privacidad/soporte; publicar URLs reales. El país indicado por el titular aún debe cotejarse con su membresía.
- Completar App Privacy, clasificación por edades, contacto y cuenta de revisión, capturas reales de los dispositivos soportados y disponibilidad. No firmar acuerdos ni declaraciones por el titular sin que los revise.

La auditoría anterior sigue vigente para los puntos no resueltos. Esta preparación no modifica ni borra familias, no cambia roles y no activa envíos adicionales.

## Fuentes

- https://docs.expo.dev/submit/ios/
- https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app
- https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion
- https://developer.apple.com/app-store/review/guidelines/#user-generated-content
