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
