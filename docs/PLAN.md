# Plan de trabajo, cronograma y seguimiento

> **Responsable de seguimiento:** _[Mar]



## 1. Tareas

Estados: **pendiente · en curso · en revisión · terminada**. Cada tarea enlaza su PR (y el PR, sus commits).

| ID | Tarea | Resp. | Depende de | Criterio de finalización | Estado | Rama / PR |
|---|---|---|---|---|---|---|
| T1 | Repositorio, roles y protección de `main` | Seguimiento | — | `main` protegida con 1 aprobación obligatoria | pendiente | ajuste de GitHub |
| T2 | Documento de interfaces y convenciones | A, B, C | T1 | `docs/INTERFACES.md` aprobado por los tres | en revisión | `docs/diseno-interfaces` |
| T3 | Plan, cronograma y tablero | Seguimiento | T1 | este archivo + tablero creados | en revisión | `docs/diseno-interfaces` |
| T4 | Núcleo de álgebra lineal + pruebas | A, B | T2 | `node tests/run-tests.js` pasa | en revisión | `feat/nucleo-algebra` |
| T5 | Catálogo de 8 piezas y malla de policubos | A | T4 | superficie cerrada, normales salientes, volumen correcto | en revisión | `feat/escena` |
| T6 | Poses, M, acciones, límites, soltar y capas | A | T5 | rigidez y límites verificados por pruebas | en revisión | `feat/escena` |
| T7 | `buildCamera`: K, R, t, P y órbita | B | T4 | ejemplo compartido reproduce `(511.111, 133.333)` | en revisión | `feat/camara-proyeccion` |
| T8 | `project`: recorte en plano cercano, caras traseras, pintor | B | T6, T7 | cámara dentro del contenedor sin NaN | en revisión | `feat/camara-proyeccion` |
| T9 | Homografía del fondo: derivación, DLT y experimento | B | T7 | error en el plano < 1e-9 px; fuera > 20 px | en revisión | `feat/homografia` |
| T10 | Lienzo, entrada, paneles y traza de un punto | C | T6, T8 | todas las piezas y controles operan | en revisión | `feat/interfaz` |
| T11 | Animación de victoria por poses 3D | C | T10 | poses rígidas vía `SET_ANIMATION`, cámara activa | en revisión | `feat/victoria-demo` |
| T12 | Demostración determinista | C | T11 | dos ejecuciones idénticas (prueba automática) | en revisión | `feat/victoria-demo` |
| T13 | Informe, README, AI_USAGE, contribuciones | Todos | T9, T12 | documentos completos | en revisión | `docs/informe-final` |
| T14 | Video (cuenta UTP, acceso restringido) | Todos | T13 | docente con acceso verificado | pendiente | — |
| T15 | Etiqueta de entrega `v1.0` | Seguimiento | T14 | etiqueta publicada sobre `main` | pendiente | — |



## 2. Registro de seguimiento (semanal)

| Semana | Fecha | Avances (con enlaces a PR/commits) | Bloqueos | Decisiones / ajustes del cronograma |
|---|---|---|---|---|
| 1 | 2026-10-27 | Primera versión de todos los módulos generada con asistencia de IA (ver `AI_USAGE.md`) y subida en ramas por módulo con sus PRs. 21 pruebas automáticas pasan. | Las ramas se subieron desde una sola cuenta: cada integrante debe revisar, aprobar y continuar su módulo desde su propia cuenta. | HTML + JS sin servidor; scripts clásicos (no módulos ES) por la restricción de `file://`. Contenedor 5×5×10. |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |


