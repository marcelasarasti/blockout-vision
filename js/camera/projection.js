/*
 * projection.js — Cadena de proyección  λ·[u v 1]ᵀ = K [R | t] M [X Y Z 1]ᵀ
 * Responsable: Estudiante B (cámara y proyección).
 *
 * Pasos para cada objeto de Geometry3D:
 *   1. X_w = M · X_local                 (4×4 · 4×1, modelo → mundo)
 *   2. X_c = [R | t] · X_w               (3×4 · 4×1, mundo → cámara)
 *   3. Visibilidad: eliminación de caras traseras (normal · X_c ≥ 0 ⇒ cara de espaldas).
 *   4. Recorte contra el plano cercano z_c = near (Sutherland–Hodgman) ⇒ nunca se divide
 *      por λ ≤ 0: los puntos detrás de la cámara no generan proyecciones inválidas.
 *   5. λ·[u v 1]ᵀ = K · X_c  y división en perspectiva  (u, v) = (x/λ, y/λ),  λ = z_c.
 *   6. Orden del pintor: primitivas ordenadas de la más lejana a la más cercana.
 */
(function (BO) {
  'use strict';
  const L = BO.linalg;

  /** [R|t]·M → matriz 3×4 que lleva coordenadas locales a coordenadas de cámara. */
  function modelView(camera, M) {
    return L.matMul(camera.Rt, M);
  }

  /** Proyecta un punto ya expresado en coordenadas de cámara. Devuelve null si z_c < near. */
  function cameraToImage(camera, Xc) {
    if (!(Xc[2] >= camera.near)) return null;
    const h = L.matVec(camera.K, Xc);     // λ·[u v 1]
    return [h[0] / h[2], h[1] / h[2]];
  }

  /**
   * Proyección completa de UN punto con todos los pasos intermedios (para la traza didáctica).
   * Xlocal (3), M (4×4). Devuelve { Xh, Xw, Xc, lambdaUV, lambda, uv | null, visible }.
   */
  function tracePoint(camera, M, Xlocal) {
    const Xh = [Xlocal[0], Xlocal[1], Xlocal[2], 1];
    const Xw = L.matVec(M, Xh);
    const Xc = L.matVec(camera.Rt, Xw);
    const lambdaUV = L.matVec(camera.K, Xc);
    const visible = Xc[2] >= camera.near;
    return {
      Xh, Xw, Xc, lambdaUV, lambda: lambdaUV[2],
      uv: visible ? [lambdaUV[0] / lambdaUV[2], lambdaUV[1] / lambdaUV[2]] : null,
      visible,
    };
  }

  /** Proyecta un punto del mundo usando directamente P (3×4). */
  function projectWorldPoint(camera, Xw) {
    const h = L.matVec(camera.P, [Xw[0], Xw[1], Xw[2], 1]);
    if (!(h[2] >= camera.near)) return null; // λ = z_c porque la última fila de K es [0 0 1]
    return [h[0] / h[2], h[1] / h[2]];
  }

  // ---------- recorte contra z_c = near ----------
  function clipSegment(a, b, near) {
    const ina = a[2] >= near, inb = b[2] >= near;
    if (ina && inb) return [a, b];
    if (!ina && !inb) return null;
    const s = (near - a[2]) / (b[2] - a[2]);
    const p = L.lerp(a, b, s); p[2] = near;
    return ina ? [a, p] : [p, b];
  }
  function clipPolygon(poly, near) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i], nxt = poly[(i + 1) % poly.length];
      const inc = cur[2] >= near, inn = nxt[2] >= near;
      if (inc) out.push(cur);
      if (inc !== inn) {
        const s = (near - cur[2]) / (nxt[2] - cur[2]);
        const p = L.lerp(cur, nxt, s); p[2] = near;
        out.push(p);
      }
    }
    return out.length >= 3 ? out : null;
  }

  /**
   * project(geometry3D, camera, options) -> DrawPrimitives2D
   *   options.faces (bool, por defecto true): dibujar caras rellenas; si es false, solo aristas.
   * Salida: { primitives:[...], stats:{ faces, culled, clipped, discarded, lines } }
   *   primitiva 'polygon': { type, points:[[u,v],...], depth, color, normalWorld, objectId }
   *   primitiva 'line':    { type, a:[u,v], b:[u,v], depth, style, objectId }
   * Ordenadas de mayor a menor profundidad (orden del pintor).
   */
  function project(geometry3D, camera, options) {
    const opt = Object.assign({ faces: true }, options || {});
    const prims = [];
    const stats = { faces: 0, culled: 0, clipped: 0, discarded: 0, lines: 0 };
    for (const obj of geometry3D.objects) {
      const MV = modelView(camera, obj.M);
      const Rm = [obj.M[0].slice(0, 3), obj.M[1].slice(0, 3), obj.M[2].slice(0, 3)];
      const Xc = obj.vertices.map((v) => L.matVec(MV, [v[0], v[1], v[2], 1]));
      const drawFaces = opt.faces && obj.faces.length > 0;
      if (drawFaces) {
        for (const f of obj.faces) {
          const poly = f.idx.map((i) => Xc[i]);
          const n = L.cross(L.sub(poly[1], poly[0]), L.sub(poly[2], poly[0]));
          if (L.dot(n, poly[0]) >= 0) { stats.culled++; continue; } // de espaldas a la cámara
          const clipped = clipPolygon(poly, camera.near);
          if (!clipped) { stats.discarded++; continue; }
          if (clipped.length !== poly.length || clipped.some((p, i) => p !== poly[i])) stats.clipped++;
          const pts = clipped.map((p) => cameraToImage(camera, p));
          const depth = clipped.reduce((s, p) => s + p[2], 0) / clipped.length;
          prims.push({ type: 'polygon', points: pts, depth, color: f.color, normalWorld: L.matVec(Rm, f.normal), objectId: obj.id });
          stats.faces++;
        }
      }
      // Las aristas de piezas solo se dibujan aparte en modo alambre (con caras, el contorno lo trae el polígono).
      if (!drawFaces) {
        for (const e of obj.edges) {
          const seg = clipSegment(Xc[e.a], Xc[e.b], camera.near);
          if (!seg) { stats.discarded++; continue; }
          if (seg[0] !== Xc[e.a] || seg[1] !== Xc[e.b]) stats.clipped++;
          prims.push({
            type: 'line', a: cameraToImage(camera, seg[0]), b: cameraToImage(camera, seg[1]),
            depth: (seg[0][2] + seg[1][2]) / 2, style: e.style, color: obj.color, objectId: obj.id,
          });
          stats.lines++;
        }
      }
    }
    prims.sort((p, q) => q.depth - p.depth);
    return { primitives: prims, stats };
  }

  BO.projection = { modelView, cameraToImage, tracePoint, projectWorldPoint, clipSegment, clipPolygon, project };
})(globalThis.BO = globalThis.BO || {});
