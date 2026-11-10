# Amor que permanece · identidad gráfica

Nombre según el logo aportado: **Amor que permanece**. Se conserva «By Departamento de Hogar y Familia» y la firma de SevenAwesome. La referencia de color es el flyer; no se incorporaron a la app sus fechas, precio ni datos del retiro.

## Recursos

- `assets/brand/logo-source.png`: logo transparente original del usuario, sin redibujar las letras. `assets/logo.png`: copia dimensionada para la interfaz.
- `assets/brand/icon-source.png`: icono original. `assets/brand/icon-square-source.png`: adaptación cuadrada a sangre sin marco negro ni esquinas prerredondeadas. `assets/icon.png`: PNG RGB de 1024 × 1024 para iOS/Android; el sistema aplica su máscara.
- `assets/android-icon-foreground.png` y `assets/android-icon-background.png`: capas adaptables, con la marca dentro de la zona segura. `assets/android-icon-monochrome.png`: corazón para iconos temáticos.
- `assets/notification-icon.png`: corazón blanco con transparencia de 96 × 96, apropiado para el aviso pequeño de Android. El icono completo se configura como `largeIcon`; iOS usa el icono de la aplicación.
- `assets/brand/splash-art-source.png`: fondo creativo generado. `assets/brand/splash-art.jpg`: versión de 1024 × 1536 optimizada, aproximadamente 228 KB, incluida localmente en la app, sin petición de red.
- `assets/logo.png`: marca horizontal para la primera pantalla nativa del sistema. `BrandedLaunch` presenta la escena creativa completa mientras carga el primer estado de la cuenta/perfil, con un mínimo de 1,2 segundos desde que la imagen está lista para evitar un destello. La escena también permanece en la bienvenida y puede revisarse desde Admin → Configuración → Ver imagen de apertura.
- `assets/brand/palette-reference.jpg`: flyer de referencia aportado.

Los recursos finales se pueden regenerar desde los originales aprobados con `powershell -NoProfile -File scripts/refresh-brand.ps1`. El script solo dimensiona, convierte formatos y prepara las capas/máscara vectorial; no descarga imágenes ni accede a cuentas.

## Paleta

Azul marino `#06264A`, azul océano `#1D6075`, turquesa `#5AAEBB`, crema `#FBF7EE`, champagne `#F7ECD2`, oro `#C79527`, oro de texto `#A77819`. Los tokens y gradientes están en `src/components/ui.tsx`. Botones y títulos usan azul; progreso y detalles usan oro; fondos suaves combinan crema y mar. Los avisos de error conservan un tono de alerta distinguible.

Se actualizó el nombre visible en acceso, ayuda, permisos de fotos, recordatorios y correos. La lectura de configuraciones antiguas sustituye solo el nombre anterior en los campos del remitente y plantillas; conserva versiones, límites, pausas, direcciones y textos personalizados. El proyecto Firebase, ID de EAS, paquete/bundle, rutas, claves de almacenamiento e IDs de niveles siguen compatibles para conservar las cuentas y los datos existentes. Los envíos de correo permanecen apagados.

## Generación de imágenes

Se utilizó la herramienta integrada **imagegen**, sin CLI ni clave API del proyecto. El logo transparente de producción es el original suministrado. Se generaron la escena y la adaptación cuadrada del icono con estas indicaciones:

### Escena de apertura · referencia: flyer

> Create a new premium vertical 2:3 artwork for the splash/welcome background of a Spanish couples' mobile app. The supplied flyer is a STYLE AND PALETTE REFERENCE ONLY, do not reproduce the flyer, its dates, prices, hotel names, lettering, church emblems, or collage. A warm Caribbean coastal overlook, calm turquoise sea, soft bright ivory sky, a few elegant palm fronds framing the upper edges, sunlit garden greenery, and a loving adult married couple seated together seen from behind in the LOWER THIRD, dressed modestly in cream linen and a straw hat, sharing a quiet moment. Natural photographic detail with a delicate editorial, painterly softness. Airy, romantic, peaceful, faithful and enduring love. Navy blue #06264A, warm metallic gold #C79527, ivory #FBF7EE, sea turquoise #5AAEBB and muted foliage greens. The TOP 45 PERCENT must be very light ivory sky with generous clean negative space for a supplied transparent navy/gold logo to be placed later by the app. Delicate warm golden sunlight near the horizon. Elegant, subtle gold and navy flowing curves at the very bottom blending into the scene, inspired by the icon's wave. Absolutely NO text, NO logos, NO letters, NO watermark, NO hearts floating in the sky, NO UI mockup. The image should feel like the same visual world as the reference flyer, with a much cleaner uncluttered layout.

### Icono · edición del icono suministrado

> Prepare this supplied app icon for production mobile app stores. It is the EDIT TARGET. Preserve the exact Spanish wordmark 'Amor que permanece', navy calligraphy, gold open heart, gold underline and cream silk background with navy/gold lower wave. Change ONLY the outer presentation: remove the black outside area and the pre-rounded corners. Extend the cream and lower navy/gold artwork seamlessly to all four edges of a FULL square. No rounded-square silhouette, no black outer area, no border, no drop shadow outside, no perspective mockup. Keep the wordmark entirely legible, centered and with comfortable padding. High fidelity to the original provided brand; exact spelling 'Amor que permanece'. A flat square 1024 by 1024 PNG app icon, all pixels opaque. Do not add any extra words or objects.

## Verificación y compilación

Se revisaron bienvenida, Hoy, aniversario y Nosotros a 390 × 844 con datos ficticios. Capturas: `preview-amor-bienvenida.jpg`, `preview-amor-hoy.jpg`, `preview-amor-aniversario.jpg`. Se comprobaron tipos, lint, 106 pruebas de dominio/regresión y 19 del Worker. Las reglas de Firestore no cambian en esta actualización.

La introspección de Expo valida la configuración de iconos adaptables, `largeIcon` y splash. Las exportaciones Android/iOS/web comprueban el empaquetado, no la apariencia del arranque del sistema. Los iconos instalados y el splash nativo requieren una nueva compilación de preview o producción; Expo Go no reproduce fielmente ese arranque. Referencias: [splash e iconos](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/), [SplashScreen SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/), [Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/).

## Administración y encabezado · 10 de noviembre de 2026

La fotografía circular de Hoy iguala la altura del logo horizontal, con un ancho máximo del logo de 230 puntos. Se compensa el margen transparente izquierdo del PNG original (70 de 1200 píxeles) en el margen derecho de la foto. La firma queda centrada solo con el logo, dos puntos debajo y con letra de diez puntos; la foto conserva su posición. Se edita en Admin → Configuración → Texto bajo el logo, admite hasta 120 caracteres y se oculta si se guarda vacía. Se sincroniza desde el documento público `config/branding`; las opciones privadas de la app siguen separadas. Los correos nuevos también utilizan esta firma.

El área administrativa usa azul profundo, superficies gris azuladas, iconos y tipografía de interfaz. Su panel agrupa los módulos en Acompañar, Comunicar y Organizar. Al entrar se oculta la barra familiar y se ofrece una salida explícita, sin cerrar la sesión. Cada módulo incluye «Cómo usar esta sección». No se incorporan dependencias ni se modifican los identificadores técnicos de la app.

El acento de amor es rojo vino `#9A3F50`, con fondo rosa crema `#F7E8E8` y borde `#E8C7CA`. Se aplica a corazones, detalles y acciones principales de los retos, inicio del recorrido y conversación. Se conservan azul marino, crema y dorado como base; la administración mantiene sus colores funcionales. Capturas: `preview-firma-centrada-amor.jpg`, `preview-reto-rojo-vino.jpg` y `preview-conversacion-amor.jpg`.
