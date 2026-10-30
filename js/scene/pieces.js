/*
 * pieces.js — Catálogo de piezas (policubos) y generación de su malla en coordenadas locales.
 * Responsable: Estudiante A (escena y geometría).
 *
 * Sistema local de una pieza: la celda (i, j, k) ocupa el cubo unitario
 * [i, i+1] × [j, j+1] × [k, k+1]. El pivote de rotación es el CENTRO de la celda `pivot`,
 * es decir el punto local pivot + (0.5, 0.5, 0.5). Rotar 90° alrededor del centro de una celda
 * lleva centros de celda a centros de celda, por lo que la pieza sigue alineada a la rejilla.
 */
(function (BO) {
  'use strict';

  const PIECES = [
    { id: 'I', name: 'Barra I', cells: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]], pivot: [1, 0, 0], planar: true, color: '#4cc9f0' },
    { id: 'L', name: 'Ele L', cells: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0]], pivot: [1, 0, 0], planar: true, color: '#f8961e' },
    { id: 'T', name: 'Te T', cells: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]], pivot: [1, 0, 0], planar: true, color: '#b5179e' },
    { id: 'S', name: 'Ese S', cells: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0]], pivot: [1, 0, 0], planar: true, color: '#90be6d' },
    { id: 'O', name: 'Cuadrado O', cells: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]], pivot: [0, 0, 0], planar: true, color: '#f9c74f' },
    { id: 'Tr', name: 'Trípode', cells: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], pivot: [0, 0, 0], planar: false, color: '#f94144' },
    { id: 'Td', name: 'Tornillo derecho', cells: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]], pivot: [1, 0, 0], planar: false, color: '#43aa8b' },
    { id: 'Ti', name: 'Tornillo izquierdo', cells: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 0, 1]], pivot: [1, 0, 0], planar: false, color: '#577590' },
  ];

  // Para la cara de dirección (eje a, signo s) se eligen ejes u, v del plano con u × v = s·e_a,
  // de modo que los vértices queden en sentido antihorario vistos desde fuera (normal saliente).
  const FACE_AXES = { 0: [1, 2], 1: [2, 0], 2: [0, 1] };

  const key3 = (p) => p[0] + ',' + p[1] + ',' + p[2];

  /**
   * Superficie exterior de un conjunto de celdas unitarias.
   * Entrada: cells = [[i,j,k], ...] (enteros).
   * Salida: { vertices: [[x,y,z],...], faces: [{ idx:[4 índices], normal:[3], cell:índice }],
   *          edges: [{ a, b }] } — solo las aristas "de contorno" (entre caras no coplanares).
   * Se omiten las caras interiores compartidas entre dos celdas del conjunto.
   */
  function polycubeMesh(cells) {
    const occupied = new Set(cells.map(key3));
    const vertices = [];
    const vIndex = new Map();
    const vid = (p) => {
      const k = key3(p);
      if (!vIndex.has(k)) { vIndex.set(k, vertices.length); vertices.push(p.slice()); }
      return vIndex.get(k);
    };
    const faces = [];
    cells.forEach((c, ci) => {
      for (let a = 0; a < 3; a++)
        for (const s of [1, -1]) {
          const nb = c.slice(); nb[a] += s;
          if (occupied.has(key3(nb))) continue; // cara interior
          let [u, v] = FACE_AXES[a];
          if (s < 0) [u, v] = [v, u];
          const base = c.slice(); if (s > 0) base[a] += 1;
          const p0 = base.slice();
          const p1 = base.slice(); p1[u] += 1;
          const p2 = p1.slice(); p2[v] += 1;
          const p3 = base.slice(); p3[v] += 1;
          const normal = [0, 0, 0]; normal[a] = s;
          faces.push({ idx: [vid(p0), vid(p1), vid(p2), vid(p3)], normal, cell: ci });
        }
    });
    // Aristas de contorno: una arista se conserva si las caras que la comparten no son coplanares.
    const edgeMap = new Map();
    faces.forEach((f) => {
      for (let k = 0; k < 4; k++) {
        const a = f.idx[k], b = f.idx[(k + 1) % 4];
        const ek = a < b ? a + '-' + b : b + '-' + a;
        if (!edgeMap.has(ek)) edgeMap.set(ek, { a: Math.min(a, b), b: Math.max(a, b), normals: new Set() });
        edgeMap.get(ek).normals.add(key3(f.normal));
      }
    });
    const edges = [];
    edgeMap.forEach((e) => { if (e.normals.size !== 1) edges.push({ a: e.a, b: e.b }); });
    return { vertices, faces, edges };
  }

  const byId = Object.fromEntries(PIECES.map((p) => [p.id, p]));
  function getPiece(id) {
    const p = byId[id];
    if (!p) throw new Error('Pieza desconocida: ' + id);
    return p;
  }
  // La malla de cada pieza no cambia: se calcula una sola vez.
  const meshCache = new Map();
  function pieceMesh(id) {
    if (!meshCache.has(id)) meshCache.set(id, polycubeMesh(getPiece(id).cells));
    return meshCache.get(id);
  }

  BO.pieces = { PIECES, getPiece, polycubeMesh, pieceMesh, key3 };
})(globalThis.BO = globalThis.BO || {});
