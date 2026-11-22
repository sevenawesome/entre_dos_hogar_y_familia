# Primera publicación de iOS

Preparación iniciada el 20 de noviembre de 2026. El titular confirmó que Apple Developer está activo y que puede entrar a App Store Connect. No se ha presentado una versión pública ni generado todavía una compilación de iOS.

## Estado comprobado el 22 de noviembre de 2026

- Expo reconoce al propietario del proyecto y la consulta de compilaciones iOS devuelve una lista vacía.
- El intento de compilación de producción cargó las ocho variables remotas y creó el canal y la rama production. También inicializó el número de compilación remoto en 1.
- La compilación se detuvo antes de subir el proyecto: no existen credenciales de firma configuradas. EAS pide ejecutar el mismo comando en modo interactivo. No hay un IPA generado ni una subida a Apple pendiente de procesamiento.
- El siguiente paso de firma necesita que el titular introduzca su contraseña y segundo factor directamente en su terminal. No deben enviarse por chat ni guardarse en archivos del repositorio.
- Tipos, lint, las 132 pruebas de la app y las 20 comprobaciones de Expo Doctor pasaron en esta revisión.

La firma permite preparar la prueba en TestFlight; no resuelve los pendientes de App Review enumerados más abajo.

## Alternativa de acceso desde la web

El siguiente intento interactivo avanzó hasta el inicio de sesión de Apple y aumentó el número remoto de compilación a 2. Terminó con `Authentication with Apple Developer Portal failed! read ECONNRESET`, después de un error de conexión al recuperar la clave de servicio de Apple. Este mensaje no confirma una contraseña incorrecta. No se inició la compilación remota.

El titular pidió utilizar la web. Iniciar sesión en el navegador no transfiere automáticamente esa sesión a EAS CLI. La alternativa admitida es crear una clave de equipo de App Store Connect desde Usuarios y acceso → Integraciones → App Store Connect API → Claves de equipo, con acceso Admin para gestionar la firma. Si aparece Solicitar acceso, debe completarlo el titular y esperar la habilitación de Apple.

Descargar el archivo .p8 una sola vez y conservarlo localmente fuera del repositorio. No enviarlo por chat. Para preparar EAS se necesitan su ruta local, Key ID, Issuer ID y el Team ID y tipo de membresía reales. Una clave individual sin Issuer ID no permite gestionar certificados ni perfiles de firma. Los identificadores todavía no se han confirmado; no deben inventarse.

EAS admite estas variables en el proceso que ejecuta el build: `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID` y `EXPO_APPLE_TEAM_TYPE`. No guardar la clave privada ni contraseñas en eas.json, EXPO_PUBLIC_* o documentación. El archivo credentials.json y la carpeta .apple-credentials están excluidos de Git por precaución si se utiliza el flujo de credenciales locales.

Referencia: https://docs.expo.dev/build/building-on-ci/#optional-provide-an-asc-api-token-for-your-apple-team

## Firma manual: solicitud preparada

El titular logró entrar al portal Apple Developer en Chrome. Se generó una clave RSA de 2048 bits y una solicitud SHA-256 local. La firma de la solicitud fue verificada con OpenSSL. La clave privada queda en `.apple-credentials/apple-distribution.key`, excluida de Git; debe conservarse para combinarla con el certificado que emita Apple. La solicitud pública `Amor-que-permanece-Apple.certSigningRequest` también se copió a Descargas para seleccionarla en el portal.

Siguiente paso del titular: Certificates → + → Apple Distribution → Continue → elegir la solicitud → Continue → Download. Falta descargar el certificado emitido por Apple, comprobar que coincide con la clave local, registrar el identificador de la app y crear su perfil App Store Connect. La generación del CSR no creó certificados remotos ni produjo un IPA.

### Certificado descargado y comprobado

Se localizó `distribution.cer` en Descargas. Su clave pública coincide con la clave privada local y el tipo es Apple Distribution. El certificado está emitido a Salim Bencosme, Team ID `6DRBD9Z2VS`, país del certificado DO, y vence el 22 de noviembre de 2027 a las 19:00:56 UTC. Se creó y verificó el paquete PKCS#12 en `.apple-credentials/distribution.p12`; su contraseña aleatoria se guarda exclusivamente en el archivo local ignorado `.apple-credentials/distribution-password.txt`. No se imprimieron la clave ni la contraseña ni se subieron a Git.

Pendiente: registrar un App ID explícito con Bundle ID `com.sevenawesome.entredos`, descripción Amor que permanece, y habilitar Push Notifications para que el perfil sea compatible con el entitlement APNs que agrega actualmente expo-notifications. No se configura un servicio de push ni se requieren claves APNs para los avisos locales existentes. Después crear un perfil App Store Connect para ese App ID y el certificado recién descargado. No activar credentialsSource=local ni iniciar otro build hasta comprobar el perfil descargado y su correspondencia con la app/certificado.

### Perfil App Store Connect verificado

El titular registró el App ID y descargó `AmorQuePermanece_AppStore.mobileprovision`. Se verificó la firma CMS del archivo y se comprobó el Team ID `6DRBD9Z2VS`, el identificador `6DRBD9Z2VS.com.sevenawesome.entredos`, la coincidencia del certificado de distribución, la caducidad, el entitlement APNs de producción y que no sea un perfil de desarrollo, ad hoc o empresarial. UUID del perfil: `dfcd7e16-43aa-4d73-9e45-1523839ead1e`.

Se copió a `.apple-credentials/appstore.mobileprovision` y se creó credentials.json local, ambos excluidos de Git. El perfil production de iOS ahora usa credentialsSource=local; Android conserva su configuración. El próximo build puede utilizar estos archivos sin iniciar sesión en Apple desde EAS CLI. Esto aún no configura el acceso para subir el resultado a App Store Connect ni crea su ficha pública.

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
