# Documento de interfaces

Este documento fija las convenciones y los contratos entre los tres módulos **antes** de implementarlos
por separado. Cualquier cambio de interfaz se registra al final (sección 9) y se aplica en un mismo PR
a todos los módulos afectados.

| Módulo | Responsable | Archivos | Estado que le pertenece |
|---|---|---|---|
| Escena y geometría (A) | Estudiante A | `js/scene/pieces.js`, `js/scene/scene.js` | `Scene`: pieza activa y su pose, cubos colocados, poses de la animación, mensajes de estado |
| Cámara y proyección (B) | Estudiante B | `js/camera/camera.js`, `js/camera/projection.js`, `js/camera/homography.js` | Ninguno persistente: funciones puras de `CameraParams` → `Camera` → `DrawPrimitives2D` |
| Interfaz y animación (C) | Estudiante C | `js/app/*.js`, `index.html`, `css/style.css` | `CameraParams` actuales, modo (alambre/caras), vista 1 de la homografía, reloj de la victoria y de la demostración |
| Núcleo compartido | Todos (revisión de A y B) | `js/math/linalg.js` | Ninguno |

Todos los módulos se cargan como scripts clásicos que se registran en el espacio de nombres global
`BO` (`BO.linalg`, `BO.scene`, `BO.camera`, …). No se usan módulos ES porque el navegador los bloquea
al abrir `index.html` con `file://`, y el enunciado exige ejecutar sin servidor.

---

## 1. Convenciones de coordenadas

| Sistema | Origen | Ejes | Unidades |
|---|---|---|---|
| **Objeto** (local de una pieza) | esquina mínima de la celda `(0,0,0)` | iguales al mundo antes de rotar | 1 = arista de un cubo |
| **Mundo** | esquina del contenedor | X a lo ancho, Y a lo hondo, **Z hacia arriba** (dextrógiro) | 1 = arista de un cubo |
| **Cámara** | centro óptico C | x_c → derecha de la imagen, y_c → **abajo**, z_c → **adelante** (eje óptico) | mismas del mundo |
| **Imagen** | esquina **superior izquierda** del lienzo | u → derecha, v → **abajo** | píxeles CSS |

- El contenedor ocupa `[0, W] × [0, D] × [0, H]` con `W = D = 5`, `H = 10`. Su **fondo es el plano Z = 0**.
- La celda entera `(i, j, k)` ocupa el cubo `[i, i+1] × [j, j+1] × [k, k+1]`.
- Ángulos de la interfaz en **grados**; ángulos internos (`rotAxis`, `rotAxisAngle`) en **radianes**.
- Matrices: arreglos de filas (`A[fila][columna]`). Los vectores se multiplican como **columnas** (`y = A·x`).

## 2. Cadena de proyección (orden de multiplicación y dimensiones)

```
λ·[u v 1]ᵀ  =  K (3×3) · [R | t] (3×4) · M (4×4) · [X Y Z 1]ᵀ (4×1)
             =  P (3×4) · M (4×4) · X̃
```

| Matriz | Dimensión | Lleva de … a … | Quién la construye |
|---|---|---|---|
| `M` | 4×4 | objeto → mundo | Escena (`modelMatrix`) |
| `[R \| t]` | 3×4 | mundo → cámara (`X_c = R·X_w + t`, `t = −R·C`) | Cámara (`buildCamera`) |
| `K` | 3×3 | cámara → imagen homogénea | Cámara (`buildCamera`) |
| `P = K[R \| t]` | 3×4 | mundo → imagen homogénea | Cámara (`buildCamera`) |

`λ = z_c` (la última fila de `K` es `[0 0 1]`); `(u, v) = (λu/λ, λv/λ)` solo si `z_c ≥ near`.

## 3. Estructuras de datos

```js
// Pieza del catálogo (constante)
Piece = { id: 'Td', name: 'Tornillo derecho', cells: [[i,j,k], ...], pivot: [i,j,k], planar: bool, color: '#rrggbb' }

// Pose de una pieza (rígida)
Pose = { position: [x,y,z],          // posición en el MUNDO del pivote (centro de la celda pivote)
         rotation: R 3×3 }           // rotación propia (RᵀR = I, det = +1)
// M = T(position) · [R 0; 0 1] · T(−(pivot + ½))

// Estado de la escena (propiedad del módulo A, inmutable: cada acción devuelve una nueva)
Scene = {
  config:    { width, depth, height },
  active:    { shapeId, pose },
  placed:    [ { cell: [i,j,k] } ],                // cubos fijos
  animation: null | { pieces: [ { shapeId, pose, color } ] },
  status:    { message, ok, piecesPlaced, layersCleared, actionCount },
}

// Instantánea geométrica que A entrega a B (vértices LOCALES + su M)
Geometry3D = { config, objects: [ {
  id: 'container' | 'axes' | 'placed' | 'active' | 'anim0'…,
  kind, M: 4×4,
  vertices: [[x,y,z], ...],                         // coordenadas del objeto
  faces: [ { idx: [i0,i1,i2,i3], normal: [nx,ny,nz], color } ],   // antihorario visto desde fuera
  edges: [ { a, b, style } ],
} ] }

// Parámetros de cámara (propiedad del módulo C, interpretados por B)
CameraParams = { target:[x,y,z], azimuth°, elevation°, distance, fovY° | focal(px), width, height, near }

// Cámara construida (B)
Camera = { params, C, K, R, t, Rt, P, f, fovY, width, height, near }

// Salida de la proyección (B → C), ordenada de lejos a cerca
DrawPrimitives2D = { primitives: [
    { type:'polygon', points:[[u,v],...], depth, color, normalWorld, objectId }
  | { type:'line', a:[u,v], b:[u,v], depth, style, color, objectId } ],
  stats: { faces, culled, clipped, discarded, lines } }
```

## 4. Parámetros de cámara y obtención de K, R, t

1. **Centro óptico** (órbita esférica alrededor de `target`):
   `C = target + distance · (cos e · cos a, cos e · sin a, sin e)`, con `a` = azimut, `e` = elevación (|e| ≤ 89°).
2. **Rotación** (filas = ejes de la cámara en el mundo):
   `r₃ = (target − C)/‖·‖` (adelante), `r₁ = r₃ × (0,0,1) / ‖·‖` (derecha), `r₂ = r₃ × r₁` (abajo), `R = [r₁; r₂; r₃]`.
3. **Traslación**: `t = −R·C`.
4. **Intrínsecos**: `f = (alto/2) / tan(fovY/2)` en píxeles, `K = [[f,0,ancho/2],[0,f,alto/2],[0,0,1]]`
   (píxeles cuadrados, sin sesgo, punto principal en el centro).

Mover la cámara solo cambia `CameraParams`; nunca modifica `Scene` ni las coordenadas del mundo.

## 5. Funciones públicas

### Módulo A — `BO.scene`

| Función | Entradas | Salida | Errores |
|---|---|---|---|
| `createScene(config?)` | `{width, depth, height}` enteros ≥ 4 (por defecto 5×5×10) | `Scene` | lanza `Error` si las dimensiones no son válidas |
| `applyAction(scene, action)` | `Scene`, `Action` (sección 6) | **nueva** `Scene` (no muta la entrada) | movimiento imposible → misma pose y `status.ok = false` con el motivo; acción mal formada → lanza `Error` |
| `getGeometry(scene)` | `Scene` | `Geometry3D` | — |
| `modelMatrix(shapeId, pose)` | id, `Pose` | `M` 4×4 | id desconocido → `Error` |
| `pieceCells(shapeId, pose)` | id, `Pose` | `[[i,j,k]]` celdas del mundo | id desconocido → `Error` |
| `BO.pieces.polycubeMesh(cells)` | celdas enteras | `{vertices, faces, edges}` superficie cerrada | — |

### Módulo B — `BO.camera`, `BO.projection`, `BO.homography`

| Función | Entradas | Salida | Errores |
|---|---|---|---|
| `buildCamera(params)` | `CameraParams` | `Camera` | `distance ≤ 0`, `near ≤ 0`, `fovY ∉ (0,180)` → `Error`; la elevación se limita a ±89° |
| `updateCameraParams(params, change)` | `CameraParams`, `{dAzimuth, dElevation, zoom, dFov, set}` | **nuevos** `CameraParams` con límites aplicados | — |
| `project(geom, camera, {faces})` | `Geometry3D`, `Camera` | `DrawPrimitives2D` | nunca devuelve NaN: recorta en `z_c = near` y descarta lo que queda detrás |
| `tracePoint(camera, M, X)` | `Camera`, 4×4, `[x,y,z]` | `{Xh, Xw, Xc, lambdaUV, lambda, uv \| null, visible}` | `uv = null` si `z_c < near` |
| `projectWorldPoint(camera, Xw)` | `Camera`, `[x,y,z]` | `[u,v] \| null` | `null` detrás del plano cercano |
| `homographyBetweenViews(cam1, cam2)` | 2 `Camera` | `H₂₁` 3×3 (`H[2][2] = 1`) | `Error` si el plano pasa por un centro óptico (H_π singular) |
| `estimateHomographyDLT(p1, p2)` | ≥ 4 pares `[u,v]` | `H` 3×3 | `Error` si hay < 4 puntos o tres colineales |
| `runExperiment(cam1, cam2, plano, fuera)` | cámaras, `[[x,y]]`, `[[x,y,z]]` | `{H, Hdlt, rows, onPlane, offPlane, baseline}` | puntos no proyectables → `error = NaN` (se excluyen de las estadísticas) |

### Módulo C — `BO.input`, `BO.renderer`, `BO.victory`, `BO.demo`, `main.js`

| Función | Entradas | Salida |
|---|---|---|
| `input.keyToCommand(evento, camParams)` | tecla | `{kind:'scene', action}` · `{kind:'camera', change}` · `{kind:'app', cmd}` · `null` |
| `renderer.drawPrimitives(ctx, prims)` | `DrawPrimitives2D.primitives` | dibuja en el canvas (no usa matrices) |
| `victory.posesAt(t, config)` | segundos | `[{shapeId, pose, color}]` o `null` al terminar |
| `demo.step(player, hooks)` | reproductor, ganchos | avanza 1/60 s y ejecuta los eventos vencidos |

## 6. Cómo las acciones y la animación modifican el estado

```
teclado / ratón / botones ──► input.keyToCommand ──► Action ──► scene.applyAction ──► Scene nueva
                                              └──► change ──► camera.updateCameraParams ──► CameraParams
reloj ──► victory.posesAt(t) ──► {type:'SET_ANIMATION'} ──► scene.applyAction
reloj fijo ──► demo.step ──► Actions + interpolación de CameraParams + inicio de la victoria
cada cuadro: getGeometry(Scene) ──► project(·, buildCamera(CameraParams)) ──► renderer
```

| Acción | Efecto |
|---|---|
| `{type:'SELECT_PIECE', shapeId}` | nueva pieza activa en la parte superior |
| `{type:'TRANSLATE', delta:[dx,dy,dz]}` | traslación entera en ejes del mundo (rechazada si sale o choca) |
| `{type:'ROTATE', axis, dir}` | `R ← Rot₉₀(eje, ±) · R` alrededor del eje del mundo que pasa por el pivote; prueba pequeños ajustes contra la pared |
| `{type:'SET_POSE', pose}` | pose arbitraria validada |
| `{type:'DROP'}` | baja hasta chocar, fija los cubos, elimina capas completas, genera la siguiente pieza |
| `{type:'SET_ANIMATION', pieces}` / `{type:'CLEAR_ANIMATION'}` | poses libres de la animación de victoria |
| `{type:'RESET'}` | escena inicial |

La animación **solo** cambia poses 3D a través de `SET_ANIMATION`; nunca anima coordenadas de pantalla.

## 7. Ejemplo compartido con resultados esperados

Cámara: `target = (0,0,0)`, azimut 0°, elevación 0°, distancia 10, `focal = 500 px`, imagen 800×600, `near = 0.1`.

| Magnitud | Valor esperado |
|---|---|
| `C` | `(10, 0, 0)` |
| `R` | `[[0, 1, 0], [0, 0, −1], [−1, 0, 0]]` |
| `t` | `(0, 0, 10)` |
| `K` | `[[500, 0, 400], [0, 500, 300], [0, 0, 1]]` |
| `M` | traslación `(1, 2, 3)` |
| `X` (local) | `(0, 0, 0)` |
| `M·X` | `(1, 2, 3, 1)` |
| `X_c = [R\|t]·M·X` | `(2, −3, 9)` |
| `λ` | `9` |
| `(u, v)` | `(400 + 1000/9, 300 − 500/3) ≈ (511.111, 133.333)` |

Comprobado automáticamente en `tests/tests.js` («cámara: ejemplo compartido de docs/INTERFACES.md»).

## 8. Implementaciones provisionales

Para no bloquear a los demás módulos, cada responsable publica primero una versión mínima:
A entrega `getGeometry` con solo el contenedor y una pieza fija; B entrega `project` sin recorte;
C dibuja líneas sin estilos. La primera integración (hito 2) se hace con esas versiones.

## 9. Registro de cambios de interfaz

| Fecha | Cambio | Módulos | PR |
|---|---|---|---|
| 2026-10-27 | Versión inicial | A, B, C | diseño |
| 2026-10-27 | `CameraParams.focal` opcional (en píxeles) para el ejemplo compartido y para rotaciones puras | B, pruebas | cámara |
| 2026-10-27 | `DrawPrimitives2D.line.color` (color del objeto para el modo aristas) | B, C | interfaz |
| 2026-10-27 | `camera.updateCameraParams` centraliza los límites de los controles | B, C | interfaz |
