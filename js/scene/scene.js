/*
 * scene.js — Estado de la escena 3D en coordenadas del mundo y sus transformaciones.
 * Responsable: Estudiante A (escena y geometría).
 *
 * Interfaz pública (ver docs/INTERFACES.md):
 *   createScene(config)          -> Scene
 *   applyAction(scene, action)   -> Scene      (función pura: no modifica `scene`)
 *   getGeometry(scene)           -> Geometry3D (objetos con vértices LOCALES y su matriz M 4×4)
 *   modelMatrix(shapeId, pose)   -> M (4×4) del sistema local de la pieza al mundo
 *   pieceCells(shapeId, pose)    -> celdas enteras ocupadas en el mundo
 *
 * Mundo: unidades = arista de un cubo. Eje Z hacia arriba. El contenedor ocupa
 * [0, W] × [0, D] × [0, H]; su fondo es el plano Z = 0.
 */
(function (BO) {
  'use strict';
  const L = BO.linalg, P = BO.pieces;

  const DEFAULT_CONFIG = { width: 5, depth: 5, height: 10 };

  // Colores por capa (como en Blockout, cada nivel tiene su color).
  const LAYER_COLORS = ['#3a86ff', '#06d6a0', '#ffd166', '#ef476f', '#8338ec', '#fb5607', '#118ab2', '#c9e4ca', '#ff99c8', '#a0c4ff'];

  // ---------- poses y matriz de modelo ----------
  /**
   * Pose de una pieza: { position:[x,y,z], rotation: R 3×3 }.
   * `position` es la posición EN EL MUNDO del pivote (centro de la celda pivote).
   * M = T(position) · [R 0; 0 1] · T(-pivote_local)
   */
  function modelMatrix(shapeId, pose) {
    const piece = P.getPiece(shapeId);
    const pivotLocal = piece.pivot.map((x) => x + 0.5);
    const R = pose.rotation;
    const t = L.sub(pose.position, L.matVec(R, pivotLocal));
    return L.rigid4(R, t);
  }

  /** Celdas del mundo ocupadas por la pieza (centros transformados y llevados a enteros). */
  function pieceCells(shapeId, pose) {
    const M = modelMatrix(shapeId, pose);
    return P.getPiece(shapeId).cells.map((c) => {
      const w = L.matVec(M, [c[0] + 0.5, c[1] + 0.5, c[2] + 0.5, 1]);
      return [Math.floor(w[0] + 1e-9), Math.floor(w[1] + 1e-9), Math.floor(w[2] + 1e-9)];
    });
  }

  function inside(cfg, c) {
    return c[0] >= 0 && c[0] < cfg.width && c[1] >= 0 && c[1] < cfg.depth && c[2] >= 0 && c[2] < cfg.height;
  }

  /** Devuelve null si la pose es válida o un texto con el motivo si no lo es. */
  function poseProblem(scene, shapeId, pose) {
    const occupied = new Set(scene.placed.map((p) => P.key3(p.cell)));
    for (const c of pieceCells(shapeId, pose)) {
      if (!inside(scene.config, c)) return 'fuera del contenedor';
      if (occupied.has(P.key3(c))) return 'choca con un cubo colocado';
    }
    return null;
  }

  /** Pose inicial de una pieza: sin rotación, centrada en X–Y y tocando el borde superior. */
  function spawnPose(cfg, shapeId) {
    const cells = P.getPiece(shapeId).cells;
    const piv = P.getPiece(shapeId).pivot;
    const maxOf = (a) => Math.max(...cells.map((c) => c[a]));
    const minOf = (a) => Math.min(...cells.map((c) => c[a]));
    // Desplazamiento entero de celdas para centrar la pieza.
    const off = [
      Math.floor((cfg.width - (maxOf(0) - minOf(0) + 1)) / 2) - minOf(0),
      Math.floor((cfg.depth - (maxOf(1) - minOf(1) + 1)) / 2) - minOf(1),
      cfg.height - 1 - maxOf(2),
    ];
    return {
      position: [piv[0] + off[0] + 0.5, piv[1] + off[1] + 0.5, piv[2] + off[2] + 0.5],
      rotation: L.identity(3),
    };
  }

  // ---------- creación ----------
  function createScene(config) {
    const cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    if (![cfg.width, cfg.depth, cfg.height].every((n) => Number.isInteger(n) && n >= 4))
      throw new Error('createScene: dimensiones enteras ≥ 4 requeridas');
    const first = P.PIECES[0].id;
    return {
      config: cfg,
      active: { shapeId: first, pose: spawnPose(cfg, first) },
      placed: [],               // [{ cell:[i,j,k] }]  cubos fijos en el contenedor
      animation: null,          // null | { pieces:[{ shapeId, pose, color? }] }
      status: { message: 'Listo', ok: true, piecesPlaced: 0, layersCleared: 0, actionCount: 0 },
    };
  }

  // ---------- acciones ----------
  function withStatus(scene, patch) {
    return Object.assign({}, scene, {
      status: Object.assign({}, scene.status, { actionCount: scene.status.actionCount + 1 }, patch),
    });
  }

  function tryPose(scene, pose, okMsg) {
    const problem = poseProblem(scene, scene.active.shapeId, pose);
    if (problem) return withStatus(scene, { ok: false, message: 'Movimiento rechazado: ' + problem });
    return Object.assign(withStatus(scene, { ok: true, message: okMsg }), {
      active: { shapeId: scene.active.shapeId, pose },
    });
  }

  function clearFullLayers(cfg, placed) {
    const perLayer = new Array(cfg.height).fill(0);
    placed.forEach((p) => perLayer[p.cell[2]]++);
    const full = perLayer.map((n, z) => (n === cfg.width * cfg.depth ? z : -1)).filter((z) => z >= 0);
    if (!full.length) return { placed, cleared: 0 };
    const kept = placed
      .filter((p) => !full.includes(p.cell[2]))
      .map((p) => ({ cell: [p.cell[0], p.cell[1], p.cell[2] - full.filter((z) => z < p.cell[2]).length] }));
    return { placed: kept, cleared: full.length };
  }

  function nextShapeId(id) {
    const i = P.PIECES.findIndex((p) => p.id === id);
    return P.PIECES[(i + 1) % P.PIECES.length].id;
  }

  /**
   * Aplica una acción y devuelve una NUEVA escena. Las acciones inválidas no lanzan
   * excepción: dejan la pieza igual y escriben el motivo en scene.status (ok = false).
   *
   * Acciones:
   *   { type:'SELECT_PIECE', shapeId }
   *   { type:'TRANSLATE', delta:[dx,dy,dz] }       (enteros, ejes del mundo)
   *   { type:'ROTATE', axis:'x'|'y'|'z', dir:±1 }  (90° alrededor del eje del mundo que pasa por el pivote)
   *   { type:'SET_POSE', pose }                    (pose arbitraria validada; usada por la demostración)
   *   { type:'DROP' }                              (baja la pieza, la fija y genera la siguiente)
   *   { type:'SET_ANIMATION', pieces:[{shapeId, pose, color?}] }  (poses libres, sin rejilla)
   *   { type:'CLEAR_ANIMATION' }
   *   { type:'RESET' }
   */
  function applyAction(scene, action) {
    if (!action || typeof action.type !== 'string') throw new Error('applyAction: acción inválida');
    const cfg = scene.config;
    const pose = scene.active.pose;
    switch (action.type) {
      case 'SELECT_PIECE': {
        P.getPiece(action.shapeId); // valida el identificador
        const np = spawnPose(cfg, action.shapeId);
        const problem = poseProblem(scene, action.shapeId, np);
        if (problem) return withStatus(scene, { ok: false, message: 'No cabe la pieza: ' + problem });
        return Object.assign(withStatus(scene, { ok: true, message: 'Pieza ' + P.getPiece(action.shapeId).name }), {
          active: { shapeId: action.shapeId, pose: np },
        });
      }
      case 'TRANSLATE': {
        const d = action.delta;
        if (!Array.isArray(d) || d.length !== 3 || !d.every(Number.isInteger)) throw new Error('TRANSLATE: delta entero de 3 componentes');
        return tryPose(scene, { position: L.add(pose.position, d), rotation: pose.rotation }, `Traslación (${d.join(', ')})`);
      }
      case 'ROTATE': {
        if (!['x', 'y', 'z'].includes(action.axis)) throw new Error('ROTATE: eje inválido');
        const R = L.matMul(L.rot90(action.axis, action.dir), pose.rotation);
        const name = `Rotación ${action.dir >= 0 ? '+' : '−'}90° en ${action.axis.toUpperCase()}`;
        let res = tryPose(scene, { position: pose.position, rotation: R }, name);
        // "Patada" contra las paredes: si la rotación no cabe, se prueban desplazamientos pequeños.
        if (!res.status.ok) {
          for (const k of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, -1], [2, 0, 0], [-2, 0, 0], [0, 2, 0], [0, -2, 0], [0, 0, -2]]) {
            const alt = tryPose(scene, { position: L.add(pose.position, k), rotation: R }, name + ' (ajustada a la pared)');
            if (alt.status.ok) return alt;
          }
        }
        return res;
      }
      case 'SET_POSE': {
        if (!L.isRotation(action.pose.rotation)) throw new Error('SET_POSE: la rotación no es rígida');
        return tryPose(scene, { position: action.pose.position.slice(), rotation: L.clone(action.pose.rotation) }, 'Pose fijada');
      }
      case 'DROP': {
        let p = pose;
        for (;;) {
          const down = { position: L.add(p.position, [0, 0, -1]), rotation: p.rotation };
          if (poseProblem(scene, scene.active.shapeId, down)) break;
          p = down;
        }
        const added = pieceCells(scene.active.shapeId, p).map((cell) => ({ cell }));
        const { placed, cleared } = clearFullLayers(cfg, scene.placed.concat(added));
        let next = nextShapeId(scene.active.shapeId);
        let s = Object.assign({}, scene, { placed });
        let msg = cleared ? `¡${cleared} capa(s) completa(s)!` : 'Pieza colocada';
        let np = spawnPose(cfg, next);
        if (poseProblem(s, next, np)) { // contenedor lleno: se vacía para seguir jugando
          s = Object.assign({}, s, { placed: [] });
          msg = 'Contenedor lleno: se reinicia el fondo';
        }
        return Object.assign(withStatus(s, {
          ok: true, message: msg,
          piecesPlaced: scene.status.piecesPlaced + 1,
          layersCleared: scene.status.layersCleared + cleared,
        }), { active: { shapeId: next, pose: np } });
      }
      case 'SET_ANIMATION': {
        action.pieces.forEach((a) => { P.getPiece(a.shapeId); if (!L.isRotation(a.pose.rotation, 1e-6)) throw new Error('SET_ANIMATION: rotación no rígida'); });
        return Object.assign({}, scene, { animation: { pieces: action.pieces.map((a) => ({ shapeId: a.shapeId, pose: a.pose, color: a.color })) } });
      }
      case 'CLEAR_ANIMATION':
        return Object.assign({}, scene, { animation: null });
      case 'RESET':
        return createScene(cfg);
      default:
        throw new Error('applyAction: tipo desconocido ' + action.type);
    }
  }

  // ---------- geometría para la proyección ----------
  /** Rejilla del contenedor: nodos enteros sobre el fondo y las 4 paredes, unidos por segmentos unitarios. */
  function containerObject(cfg) {
    const W = cfg.width, D = cfg.depth, H = cfg.height;
    const vertices = [], vIndex = new Map(), edges = [], seen = new Set();
    const vid = (p) => { const k = P.key3(p); if (!vIndex.has(k)) { vIndex.set(k, vertices.length); vertices.push(p); } return vIndex.get(k); };
    const seg = (p, q, style) => {
      const a = vid(p), b = vid(q), k = a < b ? a + '-' + b : b + '-' + a;
      if (seen.has(k)) return; seen.add(k); edges.push({ a, b, style });
    };
    // Fondo (plano Z = 0)
    for (let x = 0; x <= W; x++) for (let y = 0; y < D; y++) seg([x, y, 0], [x, y + 1, 0], 'floor');
    for (let y = 0; y <= D; y++) for (let x = 0; x < W; x++) seg([x, y, 0], [x + 1, y, 0], 'floor');
    // Paredes: líneas verticales en cada entero y anillos horizontales en cada nivel.
    const perimeter = [];
    for (let x = 0; x < W; x++) perimeter.push([x, 0]);
    for (let y = 0; y < D; y++) perimeter.push([W, y]);
    for (let x = W; x > 0; x--) perimeter.push([x, D]);
    for (let y = D; y > 0; y--) perimeter.push([0, y]);
    perimeter.forEach(([x, y], i) => {
      const [x2, y2] = perimeter[(i + 1) % perimeter.length];
      const corner = (x === 0 || x === W) && (y === 0 || y === D);
      for (let z = 0; z < H; z++) seg([x, y, z], [x, y, z + 1], corner ? 'corner' : 'wall');
      for (let z = 1; z <= H; z++) seg([x, y, z], [x2, y2, z], z === H ? 'rim' : 'wall');
    });
    return { id: 'container', kind: 'container', M: L.identity(4), vertices, edges, faces: [] };
  }

  /** Ejes del mundo (origen en la esquina del contenedor) para orientar al usuario. */
  function axesObject() {
    return {
      id: 'axes', kind: 'axes', M: L.identity(4),
      vertices: [[0, 0, 0], [1.6, 0, 0], [0, 1.6, 0], [0, 0, 1.6]],
      edges: [{ a: 0, b: 1, style: 'axisX' }, { a: 0, b: 2, style: 'axisY' }, { a: 0, b: 3, style: 'axisZ' }],
      faces: [],
    };
  }

  function pieceObject(id, shapeId, pose, color, kind) {
    const mesh = P.pieceMesh(shapeId);
    return {
      id, kind, shapeId,
      M: modelMatrix(shapeId, pose),
      vertices: mesh.vertices,                                     // coordenadas LOCALES
      faces: mesh.faces.map((f) => ({ idx: f.idx, normal: f.normal, color })),
      edges: mesh.edges.map((e) => ({ a: e.a, b: e.b, style: kind })),
      color,
    };
  }

  /**
   * Geometry3D = { config, objects:[ { id, kind, M (4×4), vertices:[[x,y,z]] locales,
   *                faces:[{ idx, normal (local), color }], edges:[{ a, b, style }] } ] }
   * Las coordenadas del mundo de un vértice X son M·[X;1]; la proyección las calcula.
   */
  function getGeometry(scene) {
    const cfg = scene.config;
    const objects = [containerObject(cfg), axesObject()];
    if (scene.placed.length) {
      const mesh = P.polycubeMesh(scene.placed.map((p) => p.cell));
      objects.push({
        id: 'placed', kind: 'placed', M: L.identity(4), vertices: mesh.vertices,
        faces: mesh.faces.map((f) => ({ idx: f.idx, normal: f.normal, color: LAYER_COLORS[scene.placed[f.cell].cell[2] % LAYER_COLORS.length] })),
        edges: mesh.edges.map((e) => ({ a: e.a, b: e.b, style: 'placed' })),
      });
    }
    if (scene.animation) {
      scene.animation.pieces.forEach((a, i) =>
        objects.push(pieceObject('anim' + i, a.shapeId, a.pose, a.color || P.getPiece(a.shapeId).color, 'anim')));
    } else {
      const a = scene.active;
      objects.push(pieceObject('active', a.shapeId, a.pose, P.getPiece(a.shapeId).color, 'active'));
    }
    return { config: cfg, objects };
  }

  BO.scene = {
    DEFAULT_CONFIG, LAYER_COLORS,
    createScene, applyAction, getGeometry, modelMatrix, pieceCells, spawnPose, poseProblem,
  };
})(globalThis.BO = globalThis.BO || {});
