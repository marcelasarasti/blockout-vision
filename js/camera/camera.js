/*
 * camera.js — Construcción explícita de la cámara de agujero (pinhole): K, R, t y P = K[R|t].
 * Responsable: Estudiante B (cámara y proyección).
 *
 * Sistema de la cámara (convención de OpenCV / Hartley–Zisserman):
 *   x_c hacia la DERECHA de la imagen, y_c hacia ABAJO, z_c hacia DELANTE (eje óptico).
 * Sistema de imagen: origen en la esquina superior izquierda, u hacia la derecha,
 *   v hacia abajo, unidades = píxeles.
 *
 * Parámetros (CameraParams):
 *   target    [x,y,z]  punto del mundo al que mira la cámara (centro de la órbita)
 *   azimuth   grados   ángulo alrededor del eje Z del mundo, medido desde +X hacia +Y
 *   elevation grados   altura sobre el plano X–Y (positiva = mirar desde arriba), |e| < 90
 *   distance  unidades distancia del centro óptico C al objetivo
 *   fovY      grados   campo de visión vertical (si se da `focal`, éste manda)
 *   focal     píxeles  (opcional) distancia focal f en píxeles
 *   width, height  píxeles  tamaño de la imagen
 *   near      unidades plano de recorte cercano (z_c ≥ near)
 */
(function (BO) {
  'use strict';
  const L = BO.linalg;
  const DEG = Math.PI / 180;
  const UP = [0, 0, 1];

  function defaultCameraParams(cfg, width = 960, height = 720) {
    return {
      target: [cfg.width / 2, cfg.depth / 2, cfg.height * 0.35],
      azimuth: -62,
      elevation: 48,
      distance: 23,
      fovY: 45,
      width, height,
      near: 0.1,
    };
  }

  /** Centro óptico C en el mundo (coordenadas esféricas alrededor de `target`). */
  function cameraCenter(p) {
    const az = p.azimuth * DEG, el = p.elevation * DEG;
    return L.add(p.target, L.scale([Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)], p.distance));
  }

  /** f (píxeles) = (alto/2) / tan(fovY/2). */
  function focalFromFov(height, fovYdeg) {
    return (height / 2) / Math.tan((fovYdeg * DEG) / 2);
  }
  function fovFromFocal(height, f) {
    return (2 * Math.atan((height / 2) / f)) / DEG;
  }

  /** Matriz intrínseca K = [[f, 0, cx], [0, f, cy], [0, 0, 1]] (píxeles cuadrados, sin sesgo). */
  function intrinsics(f, width, height) {
    return [[f, 0, width / 2], [0, f, height / 2], [0, 0, 1]];
  }

  /**
   * Rotación mundo→cámara. Sus FILAS son los ejes de la cámara expresados en el mundo:
   *   r3 = adelante = (target − C)/‖·‖,  r1 = derecha = r3 × up/‖·‖,  r2 = abajo = r3 × r1.
   * Así R·(X − C) da coordenadas de cámara y t = −R·C.
   */
  function lookAtRotation(C, target, up = UP) {
    const fwd = L.normalize(L.sub(target, C));
    let right = L.cross(fwd, up);
    if (L.norm(right) < 1e-9) right = L.cross(fwd, [0, 1, 0]); // mirada paralela a "up"
    right = L.normalize(right);
    const down = L.cross(fwd, right);
    return [right, down, fwd];
  }

  function validate(p) {
    const need = ['azimuth', 'elevation', 'distance', 'width', 'height', 'near'];
    need.forEach((k) => { if (!Number.isFinite(p[k])) throw new Error('buildCamera: parámetro inválido ' + k); });
    if (p.distance <= 0) throw new Error('buildCamera: distancia debe ser > 0');
    if (p.near <= 0) throw new Error('buildCamera: near debe ser > 0');
    if (!(p.focal > 0) && !(p.fovY > 0 && p.fovY < 180)) throw new Error('buildCamera: fovY en (0,180) o focal > 0');
  }

  /**
   * buildCamera(params) -> Camera
   *   { params, C (3), K (3×3), R (3×3), t (3), Rt (3×4), P (3×4), f, fovY, width, height, near }
   */
  function buildCamera(params) {
    const p = Object.assign({}, params);
    p.elevation = Math.max(-89, Math.min(89, p.elevation));
    validate(p);
    const f = p.focal > 0 ? p.focal : focalFromFov(p.height, p.fovY);
    const C = p.C ? p.C.slice() : cameraCenter(p);
    const R = p.R ? L.clone(p.R) : lookAtRotation(C, p.target);
    const t = L.scale(L.matVec(R, C), -1);
    const K = intrinsics(f, p.width, p.height);
    const Rt = L.hstackRt(R, t);
    const Pm = L.matMul(K, Rt);
    return { params: p, C, K, R, t, Rt, P: Pm, f, fovY: fovFromFocal(p.height, f), width: p.width, height: p.height, near: p.near };
  }

  /** Cámara con el MISMO centro y otra orientación (para el experimento de rotación pura). */
  function rotatedCamera(cam, extraR) {
    return buildCamera(Object.assign({}, cam.params, { C: cam.C, R: L.matMul(extraR, cam.R), focal: cam.f }));
  }

  BO.camera = { defaultCameraParams, cameraCenter, focalFromFov, fovFromFocal, intrinsics, lookAtRotation, buildCamera, rotatedCamera };
})(globalThis.BO = globalThis.BO || {});
