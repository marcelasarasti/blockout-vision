/*
 * linalg.js — Álgebra lineal mínima para el proyecto (compartida por todos los módulos).
 *
 * Convención: las matrices son arreglos de filas (Array<Array<number>>), es decir,
 * A[i][j] es la fila i, columna j. Los vectores son arreglos planos.
 * No se usa ninguna biblioteca externa: cada operación está escrita explícitamente.
 */
(function (BO) {
  'use strict';

  const EPS = 1e-12;

  // ---------- vectores ----------
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const scale = (a, s) => a.map((x) => x * s);
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const norm = (a) => Math.sqrt(dot(a, a));
  function normalize(a) {
    const n = norm(a);
    if (n < EPS) throw new Error('normalize: vector nulo');
    return scale(a, 1 / n);
  }
  const lerp = (a, b, s) => a.map((x, i) => x + (b[i] - x) * s);

  // ---------- matrices ----------
  function zeros(r, c) {
    return Array.from({ length: r }, () => new Array(c).fill(0));
  }
  function identity(n) {
    const I = zeros(n, n);
    for (let i = 0; i < n; i++) I[i][i] = 1;
    return I;
  }
  const clone = (A) => A.map((row) => row.slice());
  function transpose(A) {
    return A[0].map((_, j) => A.map((row) => row[j]));
  }
  /** Producto matricial A (m×n) · B (n×p) → (m×p). Lanza error si las dimensiones no coinciden. */
  function matMul(A, B) {
    const m = A.length, n = A[0].length, p = B[0].length;
    if (B.length !== n) throw new Error(`matMul: dimensiones ${m}×${n} · ${B.length}×${p}`);
    const C = zeros(m, p);
    for (let i = 0; i < m; i++)
      for (let k = 0; k < n; k++) {
        const a = A[i][k];
        if (a === 0) continue;
        for (let j = 0; j < p; j++) C[i][j] += a * B[k][j];
      }
    return C;
  }
  /** Producto matriz (m×n) · vector (n) → vector (m). */
  function matVec(A, v) {
    if (A[0].length !== v.length) throw new Error(`matVec: ${A.length}×${A[0].length} · ${v.length}`);
    return A.map((row) => row.reduce((s, a, j) => s + a * v[j], 0));
  }
  function det3(A) {
    return (
      A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
      A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
      A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
    );
  }
  function inv3(A) {
    const d = det3(A);
    if (Math.abs(d) < EPS) throw new Error('inv3: matriz singular');
    const [a, b, c] = A[0], [e, f, g] = A[1], [h, i, k] = A[2];
    return [
      [(f * k - g * i) / d, (c * i - b * k) / d, (b * g - c * f) / d],
      [(g * h - e * k) / d, (a * k - c * h) / d, (c * e - a * g) / d],
      [(e * i - f * h) / d, (b * h - a * i) / d, (a * f - b * e) / d],
    ];
  }
  /** Divide toda la matriz por el elemento (i,j) (p. ej. normalizar H con H[2][2]=1). */
  function normalizeBy(A, i, j) {
    const s = A[i][j];
    if (Math.abs(s) < EPS) throw new Error('normalizeBy: pivote nulo');
    return A.map((row) => row.map((x) => x / s));
  }
  function frobenius(A) {
    return Math.sqrt(A.reduce((s, row) => s + row.reduce((t, x) => t + x * x, 0), 0));
  }

  // ---------- transformaciones ----------
  /** Rotación 3×3 alrededor de un eje cartesiano ('x'|'y'|'z') por un ángulo en radianes (regla de la mano derecha). */
  function rotAxis(axis, rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    switch (axis) {
      case 'x': return [[1, 0, 0], [0, c, -s], [0, s, c]];
      case 'y': return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
      case 'z': return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
      default: throw new Error('rotAxis: eje inválido ' + axis);
    }
  }
  /** Rotación exacta de ±90° (entradas enteras, sin error de redondeo acumulado). */
  function rot90(axis, dir) {
    return rotAxis(axis, (dir >= 0 ? 1 : -1) * Math.PI / 2).map((r) => r.map((x) => Math.round(x)));
  }
  /** Rotación de Rodrigues alrededor de un eje unitario arbitrario. */
  function rotAxisAngle(axis, rad) {
    const [x, y, z] = normalize(axis);
    const c = Math.cos(rad), s = Math.sin(rad), C = 1 - c;
    return [
      [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
      [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
      [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
    ];
  }
  /** Matriz homogénea 4×4 a partir de R (3×3) y t (3): [R t; 0 1]. */
  function rigid4(R, t) {
    return [
      [R[0][0], R[0][1], R[0][2], t[0]],
      [R[1][0], R[1][1], R[1][2], t[1]],
      [R[2][0], R[2][1], R[2][2], t[2]],
      [0, 0, 0, 1],
    ];
  }
  const translation4 = (t) => rigid4(identity(3), t);
  /** Concatena [R | t] → matriz 3×4. */
  function hstackRt(R, t) {
    return R.map((row, i) => [row[0], row[1], row[2], t[i]]);
  }
  /** Comprueba que R sea una rotación propia (RᵀR = I, det = +1). */
  function isRotation(R, tol = 1e-9) {
    const E = matMul(transpose(R), R);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) if (Math.abs(E[i][j] - (i === j ? 1 : 0)) > tol) return false;
    return Math.abs(det3(R) - 1) < tol;
  }

  // ---------- autovalores (Jacobi) y espacio nulo ----------
  /**
   * Descomposición espectral de una matriz simétrica por el método de Jacobi.
   * Devuelve { values, vectors } con vectors[k] = autovector (columna) del autovalor values[k],
   * ordenados de menor a mayor.
   */
  function eigSymmetric(Ain, maxSweeps = 100) {
    const n = Ain.length;
    const A = clone(Ain);
    const V = identity(n);
    for (let sweep = 0; sweep < maxSweeps; sweep++) {
      let off = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
      if (off < 1e-30) break;
      for (let p = 0; p < n; p++)
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = A[k][p], akq = A[k][q];
            A[k][p] = c * akp - s * akq;
            A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = A[p][k], aqk = A[q][k];
            A[p][k] = c * apk - s * aqk;
            A[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < n; k++) {
            const vkp = V[k][p], vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq;
            V[k][q] = s * vkp + c * vkq;
          }
        }
    }
    const order = [...Array(n).keys()].sort((i, j) => A[i][i] - A[j][j]);
    return {
      values: order.map((i) => A[i][i]),
      vectors: order.map((i) => V.map((row) => row[i])),
    };
  }
  /** Vector unitario x que minimiza ‖A x‖ (autovector de AᵀA con menor autovalor). */
  function nullVector(A) {
    return eigSymmetric(matMul(transpose(A), A)).vectors[0];
  }

  // ---------- utilidades de presentación ----------
  function fmt(x, d = 3) {
    if (!Number.isFinite(x)) return String(x);
    const v = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x;
    return v.toFixed(d);
  }
  function fmtMat(A, d = 3) {
    return A.map((row) => row.map((x) => fmt(x, d)));
  }

  BO.linalg = {
    EPS, add, sub, scale, dot, cross, norm, normalize, lerp,
    zeros, identity, clone, transpose, matMul, matVec, det3, inv3, normalizeBy, frobenius,
    rotAxis, rot90, rotAxisAngle, rigid4, translation4, hstackRt, isRotation,
    eigSymmetric, nullVector, fmt, fmtMat,
  };
})(globalThis.BO = globalThis.BO || {});
