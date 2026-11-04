# Fuentes y criterio del catálogo de bodas

Consulta realizada el 4 de noviembre de 2026. Se contrastaron los nombres de los primeros 50 aniversarios y los hitos quinquenales hasta 100 con [Notre Livre](https://notrelivre.com/es/guias/aniversarios-de-boda-lista) y [Wikipedia en español](https://es.wikipedia.org/wiki/Aniversario_de_bodas).

El catálogo contiene 60 categorías y adopta una lista popular en español. Los nombres son una tradición cultural; varían según el país y la fuente. Por ejemplo, hay variantes para estaño/aluminio y para el aniversario de platino. La app explica esta variación y permite sustituir o ampliar el catálogo mediante Firebase.

Los nombres se usan como datos de referencia. Los campos `meaning` e `invitation` son reflexiones y propuestas originales redactadas para ENTRE DOS, sin reproducir los artículos consultados. No constituyen una obligación de hacer regalos ni una evaluación del matrimonio. Los años sin nombre dentro de la lista muestran sus años reales y una reflexión general.

El documento en Firestore es `catalogs/anniversaries`. La copia de origen está en `content/anniversary-catalog.json`; los cambios deben incrementar su versión y pasar por `functions/scripts/publish-anniversaries.cjs`. La lectura requiere autenticación y la escritura está reservada al servidor/Admin.
