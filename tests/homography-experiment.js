#!/usr/bin/env node
/*
 * Experimento numérico de la homografía del fondo (Z = 0) entre dos vistas.
 *   node tests/homography-experiment.js            → imprime la tabla
 *   node tests/homography-experiment.js --md FILE  → además escribe un informe Markdown
 */
'use strict';
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
['js/math/linalg.js', 'js/scene/pieces.js', 'js/scene/scene.js', 'js/camera/camera.js',
  'js/camera/projection.js', 'js/camera/homography.js'].forEach((f) => require(path.join(root, f)));
const { linalg: L, scene: S, camera: CAM, projection: PR, homography: HG } = globalThis.BO;

const cfg = S.DEFAULT_CONFIG;
const base = Object.assign(CAM.defaultCameraParams(cfg), { width: 960, height: 720 });
const cam1 = CAM.buildCamera(base);
const cam2 = CAM.buildCamera(Object.assign({}, base, { azimuth: base.azimuth + 55, elevation: 70, distance: 18, fovY: 55 }));
const pts = HG.defaultTestPoints(cfg);
const r = HG.runExperiment(cam1, cam2, pts.plane, pts.off);

// Caso de control: misma cámara rotada (mismo centro óptico).
const cam3 = CAM.rotatedCamera(cam1, L.matMul(L.rotAxis('y', 0.12), L.rotAxis('x', -0.05)));
const Hrot = HG.homographyPureRotation(cam1, cam3);
const Hplane13 = HG.homographyBetweenViews(cam1, cam3);
const rotRows = pts.plane.map((q) => [q[0], q[1], 0]).concat(pts.off).map((X) => {
  const p1 = PR.projectWorldPoint(cam1, X), p3 = PR.projectWorldPoint(cam3, X);
  return { X, eRot: Math.hypot(...L.sub(HG.applyH(Hrot, p1), p3)), ePlane: Math.hypot(...L.sub(HG.applyH(Hplane13, p1), p3)) };
});

const e = (x) => (x < 1e-3 ? x.toExponential(2) : x.toFixed(3));
const v = (a, d = 2) => '(' + a.map((x) => L.fmt(x, d)).join(', ') + ')';
const m = (A, d = 5) => A.map((row) => '| ' + row.map((x) => L.fmt(x, d)).join(' | ') + ' |').join('\n');

const md = `# Resultados numéricos de la homografía (generado)

Generado con \`node tests/homography-experiment.js --md docs/RESULTADOS_HOMOGRAFIA.md\`.
Imagen de ${base.width}×${base.height} px. Plano: fondo del contenedor, Z = 0.

## Cámaras
| | azimut | elevación | distancia | fovY | f (px) | centro C |
|---|---|---|---|---|---|---|
| Vista 1 | ${cam1.params.azimuth}° | ${cam1.params.elevation}° | ${cam1.params.distance} | ${L.fmt(cam1.fovY, 1)}° | ${L.fmt(cam1.f, 2)} | ${v(cam1.C)} |
| Vista 2 | ${cam2.params.azimuth}° | ${cam2.params.elevation}° | ${cam2.params.distance} | ${L.fmt(cam2.fovY, 1)}° | ${L.fmt(cam2.f, 2)} | ${v(cam2.C)} |

Línea base ‖C₁ − C₂‖ = ${L.fmt(r.baseline, 3)} unidades. Puntos del plano en posición general: ${r.generalPosition ? 'sí' : 'no'}.

## H₂₁ = H_π2 · H_π1⁻¹ (analítica, H[3][3] = 1)
| | | |
|---|---|---|
${m(r.H)}

## H₂₁ estimada por DLT normalizada con los ${pts.plane.length} puntos del fondo
| | | |
|---|---|---|
${m(r.Hdlt)}

Diferencia relativa de Frobenius ‖H − H_DLT‖/‖H‖ = ${e(r.dltRelDiff)}.

## Errores de transferencia  e = ‖H₂₁·x₁ − x₂‖  (píxeles)
| punto del mundo | en el plano | x₁ (vista 1) | x₂ real | H₂₁·x₁ | error (px) |
|---|---|---|---|---|---|
${r.rows.map((q) => `| ${v(q.X, 1)} | ${q.onPlane ? 'sí' : 'no'} | ${v(q.p1, 2)} | ${v(q.p2, 2)} | ${v(q.p2H, 2)} | ${e(q.error)} |`).join('\n')}

- En el plano: RMS = ${e(r.onPlane.rms)} px, máximo = ${e(r.onPlane.max)} px (error de redondeo de punto flotante).
- Fuera del plano: RMS = ${e(r.offPlane.rms)} px, máximo = ${e(r.offPlane.max)} px.

## Control: rotación pura (mismo centro óptico)
La vista 3 es la vista 1 rotada (0.12 rad en y_c, −0.05 rad en x_c) sin mover C.
H = K R₃ R₁ᵀ K⁻¹ transfiere TODOS los puntos, también los que están fuera del plano;
la homografía del plano calculada con la fórmula general coincide con ella.

| punto del mundo | error con K R₃ R₁ᵀ K⁻¹ (px) | error con H del plano (px) |
|---|---|---|
${rotRows.map((q) => `| ${v(q.X, 1)} | ${e(q.eRot)} | ${e(q.ePlane)} |`).join('\n')}
`;

console.log(md);
const i = process.argv.indexOf('--md');
if (i > 0 && process.argv[i + 1]) {
  fs.writeFileSync(path.resolve(process.argv[i + 1]), md);
  console.log('\nEscrito en', process.argv[i + 1]);
}
