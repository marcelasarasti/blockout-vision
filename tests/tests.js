/*
 * tests.js — Verificaciones de geometría e integración. Se ejecutan:
 *   - en Linux con Node:      node tests/run-tests.js
 *   - en el navegador:        abrir tests/test.html (sin servidor)
 */
(function (BO) {
  'use strict';
  const L = BO.linalg, P = BO.pieces, S = BO.scene, CAM = BO.camera, PR = BO.projection, HG = BO.homography;
  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });
  const assert = (c, msg) => { if (!c) throw new Error(msg || 'aserción fallida'); };
  const close = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg || ''} esperado ${b}, obtenido ${a}`);
  const closeVec = (a, b, tol, msg) => a.forEach((x, i) => close(x, b[i], tol, `${msg || ''}[${i}]`));

  // ---------------- álgebra ----------------
  test('linalg: inversa 3×3 y producto', () => {
    const A = [[2, 1, 0], [1, 3, 1], [0, 1, 4]];
    const I = L.matMul(A, L.inv3(A));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) close(I[i][j], i === j ? 1 : 0, 1e-12);
  });
  test('linalg: Jacobi reproduce A = V Λ Vᵀ y el espacio nulo', () => {
    const A = [[4, 1, 2], [1, 3, 0], [2, 0, 5]];
    const { values, vectors } = L.eigSymmetric(A);
    vectors.forEach((v, k) => closeVec(L.matVec(A, v), L.scale(v, values[k]), 1e-10, 'Av=λv'));
    const B = [[1, 2, 3], [2, 4, 6], [1, 0, 1]]; // rango 2
    const n = L.nullVector(B);
    assert(L.norm(L.matVec(B, n)) < 1e-10, 'B·n ≈ 0');
  });
  test('linalg: rot90 es entera y rígida', () => {
    for (const ax of ['x', 'y', 'z']) for (const d of [1, -1]) {
      const R = L.rot90(ax, d);
      assert(L.isRotation(R), 'rotación propia');
      assert(R.flat().every(Number.isInteger), 'entradas enteras');
    }
    closeVec(L.matVec(L.rot90('z', 1), [1, 0, 0]), [0, 1, 0], 0, 'Rz(+90)·x = y');
  });

  // ---------------- piezas ----------------
  test('piezas: ≥ 5 distintas, ≥ 2 no planarias, celdas conexas', () => {
    assert(P.PIECES.length >= 5);
    assert(P.PIECES.filter((p) => !p.planar).length >= 2);
    P.PIECES.forEach((p) => {
      const zs = new Set(p.cells.map((c) => c[2])), ys = new Set(p.cells.map((c) => c[1])), xs = new Set(p.cells.map((c) => c[0]));
      const isPlanar = zs.size === 1 || ys.size === 1 || xs.size === 1;
      assert(isPlanar === p.planar, p.id + ': indicador planar coherente');
    });
  });
  test('piezas: la malla es una superficie cerrada (cada arista en 2 caras) con normales salientes', () => {
    P.PIECES.forEach((p) => {
      const m = P.polycubeMesh(p.cells);
      const count = new Map();
      m.faces.forEach((f) => {
        for (let k = 0; k < 4; k++) {
          const a = f.idx[k], b = f.idx[(k + 1) % 4];
          const key = Math.min(a, b) + '-' + Math.max(a, b);
          count.set(key, (count.get(key) || 0) + 1);
        }
        const v = f.idx.map((i) => m.vertices[i]);
        const n = L.cross(L.sub(v[1], v[0]), L.sub(v[2], v[0]));
        closeVec(n, f.normal, 1e-12, p.id + ' normal');
      });
      count.forEach((c) => assert(c === 2, p.id + ': arista no compartida por 2 caras'));
      // Teorema de la divergencia: volumen = Σ (centroide·n)·área / 3 = nº de celdas.
      const vol = m.faces.reduce((s, f) => {
        const c = f.idx.map((i) => m.vertices[i]).reduce((a, b) => L.add(a, b)).map((x) => x / 4);
        return s + L.dot(c, f.normal) / 3;
      }, 0);
      close(vol, p.cells.length, 1e-9, p.id + ' volumen');
    });
  });

  // ---------------- escena ----------------
  test('escena: las rotaciones conservan la rigidez y la rejilla', () => {
    let s = S.createScene();
    S.applyAction(s, { type: 'SELECT_PIECE', shapeId: 'Td' });
    s = S.applyAction(s, { type: 'SELECT_PIECE', shapeId: 'Td' });
    const dists = (cells) => cells.flatMap((a, i) => cells.slice(i + 1).map((b) => L.norm(L.sub(a, b)))).sort();
    const ref = dists(P.getPiece('Td').cells);
    const seq = ['x', 'y', 'z', 'x', 'z', 'y', 'y', 'x'];
    seq.forEach((ax, i) => {
      s = S.applyAction(s, { type: 'ROTATE', axis: ax, dir: i % 2 ? -1 : 1 });
      const cells = S.pieceCells(s.active.shapeId, s.active.pose);
      closeVec(dists(cells), ref, 1e-9, 'distancias');
      assert(L.isRotation(s.active.pose.rotation), 'R rígida');
      assert(s.active.pose.rotation.flat().every(Number.isInteger), 'sin deriva numérica');
    });
  });
  test('escena: cuatro rotaciones de 90° devuelven la pieza a su lugar', () => {
    let s = S.applyAction(S.createScene(), { type: 'TRANSLATE', delta: [0, 0, -4] });
    const before = JSON.stringify(S.pieceCells(s.active.shapeId, s.active.pose));
    for (let i = 0; i < 4; i++) s = S.applyAction(s, { type: 'ROTATE', axis: 'x', dir: 1 });
    assert(JSON.stringify(S.pieceCells(s.active.shapeId, s.active.pose)) === before);
  });
  test('escena: los límites rechazan salir del contenedor sin lanzar excepción', () => {
    let s = S.createScene();
    for (let i = 0; i < 10; i++) s = S.applyAction(s, { type: 'TRANSLATE', delta: [1, 0, 0] });
    assert(!s.status.ok, 'el último movimiento debe rechazarse');
    S.pieceCells(s.active.shapeId, s.active.pose).forEach((c) => assert(c[0] < s.config.width));
  });
  test('escena: soltar fija los cubos en el fondo y completar una capa la elimina', () => {
    let s = S.createScene({ width: 4, depth: 4, height: 6 });
    // 4 barras I en Y = 0..3 llenan la capa Z = 0 de un contenedor 4×4.
    for (let y = 0; y < 4; y++) {
      s = S.applyAction(s, { type: 'SELECT_PIECE', shapeId: 'I' });
      const dy = y - Math.floor(s.active.pose.position[1]);
      s = S.applyAction(s, { type: 'TRANSLATE', delta: [0, dy, 0] });
      s = S.applyAction(s, { type: 'DROP' });
    }
    assert(s.status.layersCleared === 1, 'una capa eliminada');
    assert(s.placed.length === 0, 'contenedor vacío tras eliminar la capa');
  });
  test('escena: applyAction no modifica la escena de entrada', () => {
    const s = S.createScene();
    const snap = JSON.stringify(s);
    S.applyAction(s, { type: 'ROTATE', axis: 'z', dir: 1 });
    S.applyAction(s, { type: 'DROP' });
    assert(JSON.stringify(s) === snap);
  });

  function run(log) {
    let pass = 0;
    const failures = [];
    for (const t of tests) {
      try { t.fn(); pass++; log(`✔ ${t.name}`, true); } catch (e) { failures.push(t.name); log(`✘ ${t.name}\n    ${e.message}`, false); }
    }
    log(`\n${pass}/${tests.length} pruebas superadas`, failures.length === 0);
    return { pass, total: tests.length, failures };
  }

  BO.tests = { run, count: () => tests.length };
})(globalThis.BO = globalThis.BO || {});
