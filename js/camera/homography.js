/*
 * homography.js — Homografía inducida por un plano de la escena entre dos vistas.
 * Responsable: Estudiante B (cámara y proyección).
 *
 * Plano elegido: el FONDO del contenedor, Z = 0. Un punto del plano es X = [x, y, 0, 1]ᵀ, así que
 *   λ·[u v 1]ᵀ = P·X = [p1 p2 p4]·[x y 1]ᵀ = H_π · [x y 1]ᵀ
 * donde p_k es la columna k de P. H_π (3×3) lleva coordenadas del plano a la imagen.
 * Para dos cámaras P1 y P2:   x2 ~ H21 · x1   con   H21 = H_π2 · H_π1⁻¹.
 *
 * Fuera del plano (Z ≠ 0) la relación deja de cumplirse si los centros ópticos difieren:
 * el error es proporcional al paralaje Z y a la línea base entre cámaras.
 * Si la cámara solo ROTA (mismo centro), H = K2 R2 R1ᵀ K1⁻¹ sirve para TODOS los puntos.
 */
(function (BO) {
  'use strict';
  const L = BO.linalg, PR = BO.projection;

  /** Homografía plano Z=0 → imagen: columnas 1, 2 y 4 de P. */
  function planeToImage(P) {
    return P.map((row) => [row[0], row[1], row[3]]);
  }

  /** H21 = H_π2 · H_π1⁻¹, normalizada con H[2][2] = 1. */
  function homographyBetweenViews(cam1, cam2) {
    return L.normalizeBy(L.matMul(planeToImage(cam2.P), L.inv3(planeToImage(cam1.P))), 2, 2);
  }

  /**
   * Forma "de libro" de la homografía inducida por un plano (Hartley–Zisserman, cap. 13):
   *   plano del mundo  n_wᵀ X = d_w ;   en la cámara 1:  nᵀ X_c1 = d  con  n = R1 n_w,  d = d_w + nᵀ t1
   *   movimiento relativo X_c2 = R X_c1 + t,  R = R2 R1ᵀ,  t = t2 − R t1
   *   ⇒  H21 = K2 (R + t nᵀ / d) K1⁻¹
   * Sirve para comprobar de forma independiente la H calculada con columnas de P.
   */
  function homographyFromPlane(cam1, cam2, nWorld = [0, 0, 1], dWorld = 0) {
    const n = L.matVec(cam1.R, nWorld);
    const d = dWorld + L.dot(n, cam1.t);
    if (Math.abs(d) < 1e-12) throw new Error('El centro óptico de la vista 1 está sobre el plano');
    const R = L.matMul(cam2.R, L.transpose(cam1.R));
    const t = L.sub(cam2.t, L.matVec(R, cam1.t));
    const A = R.map((row, i) => row.map((x, j) => x + (t[i] * n[j]) / d));
    return L.normalizeBy(L.matMul(L.matMul(cam2.K, A), L.inv3(cam1.K)), 2, 2);
  }

  /** H inducida por una rotación pura (mismo centro óptico): K2 R2 R1ᵀ K1⁻¹. */
  function homographyPureRotation(cam1, cam2) {
    return L.normalizeBy(L.matMul(L.matMul(cam2.K, L.matMul(cam2.R, L.transpose(cam1.R))), L.inv3(cam1.K)), 2, 2);
  }

  function applyH(H, p) {
    const h = L.matVec(H, [p[0], p[1], 1]);
    return [h[0] / h[2], h[1] / h[2]];
  }

  /** true si ninguna terna de puntos 2D es colineal (|área| > tol). */
  function generalPosition(points, tol = 1e-6) {
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++)
        for (let k = j + 1; k < points.length; k++) {
          const [a, b, c] = [points[i], points[j], points[k]];
          const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
          if (Math.abs(area) < tol) return false;
        }
    return true;
  }

  /** Normalización de Hartley: centroide en el origen y distancia media √2. */
  function normalizer(pts) {
    const n = pts.length;
    const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
    const d = pts.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / n;
    const s = Math.SQRT2 / d;
    return [[s, 0, -s * cx], [0, s, -s * cy], [0, 0, 1]];
  }

  /**
   * DLT normalizada: estima H tal que pts2 ~ H·pts1 a partir de n ≥ 4 correspondencias.
   * Cada correspondencia aporta 2 filas a A (2n × 9); h es el vector unitario que minimiza ‖A h‖.
   */
  function estimateHomographyDLT(pts1, pts2) {
    if (pts1.length < 4 || pts1.length !== pts2.length) throw new Error('DLT: se requieren ≥ 4 correspondencias');
    if (!generalPosition(pts1) || !generalPosition(pts2)) throw new Error('DLT: hay tres puntos colineales');
    const T1 = normalizer(pts1), T2 = normalizer(pts2);
    const A = [];
    pts1.forEach((p, i) => {
      const [x, y] = applyH(T1, p), [u, v] = applyH(T2, pts2[i]);
      A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, -u]);
    });
    const h = L.nullVector(A);
    const Hn = [h.slice(0, 3), h.slice(3, 6), h.slice(6, 9)];
    return L.normalizeBy(L.matMul(L.matMul(L.inv3(T2), Hn), T1), 2, 2);
  }

  /**
   * Experimento completo entre dos cámaras.
   *   planePoints: puntos [x, y] del fondo (Z = 0)
   *   offPoints:   puntos [x, y, z] fuera del plano
   * Devuelve H analítica, H estimada por DLT, filas con errores (píxeles) y resúmenes.
   */
  function runExperiment(cam1, cam2, planePoints, offPoints) {
    const H = homographyBetweenViews(cam1, cam2);
    const row = (Xw, onPlane) => {
      const p1 = PR.projectWorldPoint(cam1, Xw);
      const p2 = PR.projectWorldPoint(cam2, Xw);
      if (!p1 || !p2) return { X: Xw, onPlane, p1, p2, p2H: null, error: NaN };
      const p2H = applyH(H, p1);
      return { X: Xw, onPlane, p1, p2, p2H, error: Math.hypot(p2H[0] - p2[0], p2H[1] - p2[1]) };
    };
    const rows = planePoints.map((q) => row([q[0], q[1], 0], true)).concat(offPoints.map((X) => row(X, false)));
    const on = rows.filter((r) => r.onPlane && Number.isFinite(r.error));
    const off = rows.filter((r) => !r.onPlane && Number.isFinite(r.error));
    let Hdlt = null, dltDiff = NaN;
    if (on.length >= 4) {
      try {
        Hdlt = estimateHomographyDLT(on.map((r) => r.p1), on.map((r) => r.p2));
        dltDiff = L.frobenius(H.map((r, i) => r.map((x, j) => x - Hdlt[i][j]))) / L.frobenius(H);
      } catch (e) { Hdlt = null; }
    }
    const stat = (rs) => rs.length ? {
      rms: Math.sqrt(rs.reduce((s, r) => s + r.error * r.error, 0) / rs.length),
      max: Math.max(...rs.map((r) => r.error)),
    } : { rms: NaN, max: NaN };
    return {
      H, Hdlt, dltRelDiff: dltDiff, rows,
      onPlane: stat(on), offPlane: stat(off),
      baseline: L.norm(L.sub(cam1.C, cam2.C)),
      generalPosition: generalPosition(planePoints),
    };
  }

  /** Puntos de prueba por defecto: 5 del fondo (sin tres colineales) y 6 fuera del plano. */
  function defaultTestPoints(cfg) {
    const W = cfg.width, D = cfg.depth, H = cfg.height;
    return {
      plane: [[0.5, 0.5], [W - 0.7, 0.9], [W - 1.2, D - 0.6], [1.1, D - 1.3], [W * 0.55, D * 0.35]],
      off: [[0, 0, H], [W, 0, H], [W, D, H], [0, D, H], [W / 2, D / 2, H / 2], [W, D / 2, 2]],
    };
  }

  BO.homography = {
    planeToImage, homographyBetweenViews, homographyFromPlane, homographyPureRotation, applyH,
    generalPosition, estimateHomographyDLT, runExperiment, defaultTestPoints,
  };
})(globalThis.BO = globalThis.BO || {});
