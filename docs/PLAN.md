# Plan de trabajo, cronograma y seguimiento

> **Responsable de seguimiento:** _[nombre del integrante]_ — mantiene este archivo y el tablero al día.
> Todos los integrantes registran sus avances en la sección 4 al menos una vez por semana.
> Las fechas son **previstas**: ajústenlas a la fecha oficial de entrega y registren cada ajuste.

## 1. Roles

| Rol | Integrante | Cuenta de GitHub | Revisa a |
|---|---|---|---|
| A · Escena y geometría | _[nombre]_ | _@usuario_ | B |
| B · Cámara y proyección | _[nombre]_ | _@usuario_ | C |
| C · Interfaz y animación | _[nombre]_ | _@usuario_ | A |

## 2. Tareas

Estados: **pendiente · en curso · en revisión · terminada**. Cada tarea enlaza su PR (y el PR, sus commits).

| ID | Tarea | Resp. | Depende de | Criterio de finalización | Estado | Rama / PR |
|---|---|---|---|---|---|---|
| T1 | Repositorio, roles y protección de `main` | Seguimiento | — | `main` protegida con 1 aprobación obligatoria | pendiente | ajuste de GitHub |
| T2 | Documento de interfaces y convenciones | A, B, C | T1 | `docs/INTERFACES.md` aprobado por los tres | en revisión | `docs/diseno-interfaces` |
| T3 | Plan, cronograma y tablero | Seguimiento | T1 | este archivo + tablero creados | en revisión | `docs/diseno-interfaces` |
| T4 | Núcleo de álgebra lineal + pruebas | A, B | T2 | `node tests/run-tests.js` pasa | pendiente | `feat/nucleo-algebra` |
| T5 | Catálogo de 8 piezas y malla de policubos | A | T4 | superficie cerrada, normales salientes, volumen correcto | pendiente | `feat/escena` |
| T6 | Poses, M, acciones, límites, soltar y capas | A | T5 | rigidez y límites verificados por pruebas | pendiente | `feat/escena` |
| T7 | `buildCamera`: K, R, t, P y órbita | B | T4 | ejemplo compartido reproduce `(511.111, 133.333)` | pendiente | `feat/camara-proyeccion` |
| T8 | `project`: recorte en plano cercano, caras traseras, pintor | B | T6, T7 | cámara dentro del contenedor sin NaN | pendiente | `feat/camara-proyeccion` |
| T9 | Homografía del fondo: derivación, DLT y experimento | B | T7 | error en el plano < 1e-9 px; fuera > 20 px | pendiente | `feat/homografia` |
| T10 | Lienzo, entrada, paneles y traza de un punto | C | T6, T8 | todas las piezas y controles operan | pendiente | `feat/interfaz` |
| T11 | Animación de victoria por poses 3D | C | T10 | poses rígidas vía `SET_ANIMATION`, cámara activa | pendiente | `feat/victoria-demo` |
| T12 | Demostración determinista | C | T11 | dos ejecuciones idénticas (prueba automática) | pendiente | `feat/victoria-demo` |
| T13 | Informe, README, AI_USAGE, contribuciones | Todos | T9, T12 | documentos completos | pendiente | `docs/informe-final` |
| T14 | Video (cuenta UTP, acceso restringido) | Todos | T13 | docente con acceso verificado | pendiente | — |
| T15 | Etiqueta de entrega `v1.0` | Seguimiento | T14 | etiqueta publicada sobre `main` | pendiente | — |

## 3. Cronograma (hitos)

```
             oct 27   nov 3    nov 10   nov 17   nov 24   dic 1
Hito 1  ████                                                       Diseño (T1–T3)
Hito 2      ███████                                                Primera integración (T4–T8)
Hito 3             ████████████                                    Prototipo interactivo (T9–T10)
Hito 4                         ████████████████                    Integración final (T11–T15)
Revisión        ▲        ▲        ▲        ▲        ▲              revisión semanal del tablero
```

| Hito | Contenido | Fecha prevista | Fecha real | Evidencia |
|---|---|---|---|---|
| 1 · Diseño | repositorio, roles, convenciones, interfaces, plan | 2026-10-30 | | PR `docs/diseno-interfaces` |
| 2 · Primera integración | contenedor + una pieza proyectados con la matriz de cámara | 2026-11-06 | | PRs `feat/nucleo-algebra`, `feat/escena`, `feat/camara-proyeccion` |
| 3 · Prototipo interactivo | 8 piezas, controles de pieza y cámara, homografía | 2026-11-20 | | PRs `feat/homografia`, `feat/interfaz` |
| 4 · Integración final | victoria, demo, verificaciones, documentación, video, etiqueta | 2026-12-01 | | PRs `feat/victoria-demo`, `docs/informe-final`, etiqueta `v1.0` |

Orden de integración de los PRs (cada uno parte del anterior): diseño → núcleo → escena → cámara →
homografía → interfaz → victoria/demo → informe. Al integrar uno, GitHub reasigna el siguiente a `main`.

## 4. Registro de seguimiento (semanal)

| Semana | Fecha | Avances (con enlaces a PR/commits) | Bloqueos | Decisiones / ajustes del cronograma |
|---|---|---|---|---|
| 1 | 2026-10-27 | Interfaces, convenciones y plan publicados para revisión (T2, T3). | — | HTML + JS sin servidor; scripts clásicos (no módulos ES) por la restricción de `file://`. Contenedor 5×5×10. |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

## 5. Tablero

Se recomienda un **GitHub Project** (vista tablero) con las columnas *Pendiente · En curso · En revisión ·
Terminada*, una *issue* por tarea T1–T15 y cada PR enlazado con `Closes #n`. Mientras tanto, la tabla de la
sección 2 hace de tablero y se actualiza en cada revisión semanal.
