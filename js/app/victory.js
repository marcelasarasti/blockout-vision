/*
 * victory.js — Animación de victoria con objetos 3D.
 * Responsable: Estudiante C (interfaz y animación).
 *
 * La animación NO toca coordenadas de pantalla: para cada instante calcula POSES 3D
 * (posición del pivote en el mundo + rotación R) y las entrega a la escena mediante
 * applyAction(scene, { type:'SET_ANIMATION', pieces }). Después, la misma cadena
 * K[R|t]·M proyecta esas piezas, y la cámara sigue siendo controlable.
 *
 * Fases (t en segundos):
 *   0 – 3  : las piezas orbitan alrededor del contenedor girando sobre sí mismas.
 *   3 – 6  : cada pieza vuela a su lugar en una "corona" sobre el borde del contenedor.
 *   6 – 9  : la corona ensamblada gira alrededor del eje vertical del contenedor y rebota.
 */
(function (BO) {
  'use strict';
  const L = BO.linalg, P = BO.pieces;

  const DURATION = 9;
  const smooth = (x) => { const s = Math.max(0, Math.min(1, x)); return s * s * (3 - 2 * s); };

  /** Poses de todas las piezas en el instante t, o null si la animación terminó. */
  function posesAt(t, cfg) {
    if (t < 0 || t > DURATION) return null;
    const N = P.PIECES.length;
    const c = [cfg.width / 2, cfg.depth / 2, cfg.height / 2];
    const crownR = Math.max(cfg.width, cfg.depth) * 0.62, orbitR = Math.max(cfg.width, cfg.depth) * 1.7;
    const s = smooth((t - 3) / 3);                // 0 → 1 durante el ensamblaje
    const gamma = t > 6 ? 1.4 * (t - 6) : 0;     // giro de la corona ensamblada
    const bounce = t > 6 ? 0.35 * Math.abs(Math.sin(5 * (t - 6))) * (1 - (t - 6) / 3) : 0;
    const Rg = L.rotAxis('z', gamma);
    return P.PIECES.map((piece, i) => {
      const b = (2 * Math.PI * i) / N;
      // Destino en la corona (antes de girarla).
      const target = [c[0] + crownR * Math.cos(b), c[1] + crownR * Math.sin(b), cfg.height + 1.5];
      const Rtarget = L.matMul(L.rotAxis('z', b + Math.PI / 2), L.rotAxis('x', Math.PI / 2));
      // Órbita.
      const a = b + 1.1 * t;
      const orbit = [c[0] + orbitR * Math.cos(a), c[1] + orbitR * Math.sin(a), c[2] + 2.2 * Math.sin(1.7 * t + i)];
      const spinAxis = L.normalize([Math.sin(i * 1.3 + 0.3), Math.cos(i * 0.7), 0.8]);
      const Rspin = L.rotAxisAngle(spinAxis, 3.2 * t * (1 - s));
      let position = L.lerp(orbit, target, s);
      let rotation = L.matMul(Rspin, Rtarget);
      // Giro rígido de toda la corona alrededor del eje vertical que pasa por el centro.
      const rel = L.sub(position, [c[0], c[1], 0]);
      position = L.add(L.matVec(Rg, rel), [c[0], c[1], bounce]);
      rotation = L.matMul(Rg, rotation);
      return { shapeId: piece.id, pose: { position, rotation }, color: piece.color };
    });
  }

  BO.victory = { DURATION, posesAt };
})(globalThis.BO = globalThis.BO || {});
