# Primera publicación de iOS

Preparación iniciada el 20 de noviembre de 2026. El titular confirmó que Apple Developer está activo y ya entró a App Store Connect desde Chrome. Se inició la compilación iOS en Expo con firma manual; no se ha presentado una versión pública. El resultado y los intentos figuran más abajo.

## Comprobaciones iniciales del 22 de noviembre de 2026

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

### Primer intento remoto y ajuste del paquete de firma

Expo aceptó la compilación `20ae67e4-87f1-4028-852e-a624479b567a`, versión 1.0.0 (3), del commit `26ea34093bdb2cc8e327e3477b7ae419b7dbcb2a`. Terminó con error en Prepare credentials: macOS no pudo verificar el MAC del PKCS#12 y no importó la identidad. No llegó a producir el IPA.

Se reexportó el mismo certificado y clave privada a `.apple-credentials/distribution-apple.p12`, usando MAC SHA-1 y PBE-SHA1-3DES para compatibilidad con el importador PKCS#12 de macOS. Se comprobaron nuevamente la huella del certificado y la clave pública derivada de la clave privada del paquete. La contraseña se conservó localmente; credentials.json apunta al nuevo archivo. El paquete original se conserva. Se lanzó un nuevo intento 1.0.0 (4); su resultado todavía debe comprobarse. Este ajuste solo afecta al contenedor de firma, no al cifrado ni a la funcionalidad de la app.

El segundo intento, ID `b98a56c2-2e1d-4fb4-b422-399b830c6bf9`, terminó correctamente el 22 de noviembre de 2026 a las 19:36:52 UTC. Prepare credentials terminó correctamente después de reexportar el paquete. También pasaron Expo Doctor, prebuild, CocoaPods, configuración de Expo Update, empaquetado JavaScript, compilación y firma de Xcode y subida de artefactos a Expo.

Se descargó e inspeccionó el IPA 1.0.0 (4): Bundle ID `com.sevenawesome.entredos`, nombre visible Amor que permanece, iOS mínimo 16.4 y soporte iPhone/iPad. Coincide el perfil embebido con el perfil local. Expo Update está habilitado con el endpoint del proyecto, canal production y runtime `684d35857bf35e13671ea2a0bebf8b2fb9409db4`, leído del recurso EXUpdates.bundle/fingerprint. Se verificaron los textos de permisos de cámara/galería y la ausencia de archivos privados de firma en el ZIP. SHA-256 del IPA: `f8036d072e57566b77d27c3c7622068f7513147f74285a20551e26194d1f1c98`. Esto comprueba el artefacto, no sustituye instalarlo en un teléfono ni valida la ficha pública. Resumen en IOS_BUILD.json.

El titular creó la ficha de App Store Connect con Apple ID `6838059210`; la captura muestra español de México como idioma de la ficha. El ascAppId ya se añadió a submit.production.ios. Solicitó acceso a App Store Connect API y Apple lo aprobó. Se descargó una clave de equipo con rol App Manager y se comprobó su autenticación mediante la API: devuelve el nombre, SKU, idioma e identificador de esta app. El archivo privado se conserva en .apple-credentials, excluido de Git; eas.json contiene únicamente la ruta local y los identificadores públicos de la clave.

## Subida a App Store Connect

La ejecución de `eas submit --platform ios --profile production --id b98a56c2-2e1d-4fb4-b422-399b830c6bf9 --non-interactive --wait` terminó correctamente. ID de envío Expo: `a8ad5532-ad4b-4a5b-9597-ecd3646bb893`. Después del procesamiento, la API de Apple confirmó el build `2ecf2642-6f92-40e5-88a7-2dcbf698f019`, versión 1.0.0 (4), con processingState=VALID, internalBuildState=READY_FOR_BETA_TESTING y usesNonExemptEncryption=false.

Se creó el grupo interno Pruebas internas (ID `f497435e-ed92-41ab-b35d-317dfe08367c`) y se verificó que contiene este build. Tiene cero probadores: no se añadieron personas ni enviaron invitaciones. Se configuró What to Test en español de México con las pruebas de registro, correo, fotos, sincronización, retos y recordatorios. Para instalar, el titular debe entrar en TestFlight → Pruebas internas → Invite Testers, seleccionar su usuario de App Store Connect, pulsar Add y aceptar la invitación desde la app TestFlight en su iPhone. No necesita Expo Go ni un servidor local.

No se envió la versión a App Review ni se publicó en la tienda. Tipos y lint pasaron después de configurar la subida. Sigue pendiente la prueba física del binario y los bloqueos de revisión pública indicados al final.

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

### Borrado definitivo y moderación — verificado el 23 de noviembre

La compilación **1.0.0 (5)** terminó y fue subida a App Store Connect mediante la clave API existente, sin pedir un nuevo inicio de sesión. Apple la procesó como `VALID` y quedó `IN_BETA_TESTING`, vinculada a **Pruebas internas**. El grupo tiene un probador; no se enviaron invitaciones nuevas. Las instrucciones de prueba en es-MX incluyen cuentas ficticias, fotos, normas, aprobación, reportes, bloqueos y borrado definitivo.

Se verificaron el identificador, versión, perfil de firma, canal production, ausencia de archivos privados de firma en el IPA y las funciones nuevas dentro del paquete JavaScript incorporado. SHA-256, runtime, IDs y estado figuran en [IOS_BUILD.json](IOS_BUILD.json). El código compilado corresponde a `1150799f41795d2efbbece5dbf1bfd79d8f846c8`.

También se publicó y comprobó la actualización de Expo Go para iOS/Android, grupo `d0bb287b-6e6c-486d-b25d-657068e994e8`, usando el mismo QR. Servicio, reglas e índices están desplegados; el recurso web de solicitud de borrado responde correctamente. Procedimiento: [MODERACION_Y_BORRADO.md](MODERACION_Y_BORRADO.md).

Queda la prueba física entre dos cuentas ficticias y completar la ficha pública y los datos pendientes de App Review. No se ha presentado esta versión a revisión pública.
