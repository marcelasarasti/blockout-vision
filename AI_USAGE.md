# Uso de IA y desarrollo con agentes

El equipo conserva la responsabilidad sobre la corrección, la integración y la explicación de todo lo
entregado. Este archivo se actualiza cada vez que se usa un asistente.

## Herramientas

| Herramienta | Versión / modelo | Quién la usó | Cuándo |
|---|---|---|---|
| Claude (Anthropic), modo agente con terminal y GitHub | Claude Opus 5.5 | _[Mar]_ | 2026‑10‑27 |

## Tareas delegadas

En la sesión del 2026‑10‑27 se entregó al agente el enunciado del proyecto. Generó una primera versión
completa, subida en ramas separadas por módulo para que cada integrante la revise:

- Arquitectura e interfaces (`docs/INTERFACES.md`) y plan de trabajo (`docs/PLAN.md`).
- Álgebra lineal (`js/math/linalg.js`), escena y piezas (A), cámara, proyección y homografía (B),
  interfaz, animación y demostración (C).
- Pruebas automáticas, experimento numérico de la homografía e informe.

Las decisiones de diseño (HTML sin servidor, contenedor 5×5×10, ocho piezas, convención de cámara de
OpenCV, algoritmo del pintor) las propuso el agente. **El equipo debe revisarlas y aceptarlas o cambiarlas
en la revisión de cada PR.**

## Verificación del código generado y de las afirmaciones matemáticas

1. **Pruebas automáticas** (`node tests/run-tests.js`, 23 pruebas): ejemplo calculado a mano en
   `docs/INTERFACES.md` (sección 7), propiedades invariantes (rotaciones propias, rigidez, superficies
   cerradas, volumen), recorte sin NaN y determinismo de la demostración.
2. **Dos derivaciones independientes de la homografía**, por columnas de `P` y por `K₂(R + t nᵀ/d)K₁⁻¹`,
   comparadas numéricamente. Estimación por DLT a partir de las imágenes, sin usar las cámaras.
3. **Predicción del error fuera del plano**: el término de paralaje `ρ·K₂t` reproduce la proyección real
   con error < 10⁻⁸ px. El caso de rotación pura transfiere todos los puntos.
4. **Ejecución en navegador** con `file://` (Chromium, Linux): capturas de pantalla, sin errores de consola,
   y la demostración completa ejecutada de principio a fin.
5. **Pendiente para el equipo**: cada integrante debe rehacer a mano el ejemplo compartido y seguir un punto
   desde las coordenadas del objeto hasta la pantalla con el panel «Traza de un punto».

## Errores significativos encontrados y corregidos

| Error | Cómo se detectó | Corrección |
|---|---|---|
| La matriz `[R \| t]` y la `H` estimada por DLT se desbordaban del panel lateral | captura de pantalla | se muestran a lo ancho del panel |

En la sesión de generación no aparecieron errores matemáticos: las pruebas pasaron en la primera
ejecución. Esto **no** sustituye la revisión humana.

_(Agreguen aquí los errores que encuentren en sus revisiones.)_

## Proceso

Los cambios generados por IA siguen el mismo flujo que el resto: rama → PR → revisión humana de un
compañero distinto del autor → integración. Ningún cambio de IA se integra en `main` sin aprobación.
