/*
 * input.js — Traducción de entradas del usuario a ACCIONES (sin efectos secundarios).
 * Responsable: Estudiante C (interfaz y animación).
 *
 * keyToCommand(event, cameraParams) -> null | { kind:'scene', action }
 *                                          | { kind:'camera', change }
 *                                          | { kind:'app', cmd }
 * Las flechas mueven la pieza a lo largo del eje del MUNDO (±X o ±Y) que mejor coincide
 * con la dirección de pantalla, para que el control sea intuitivo aunque la cámara orbite.
 */
(function (BO) {
  'use strict';
  const DEG = Math.PI / 180;

  /** Eje del mundo (entero) más alineado con un vector horizontal. */
  function snapAxis(vx, vy) {
    return Math.abs(vx) >= Math.abs(vy) ? [Math.sign(vx), 0, 0] : [0, Math.sign(vy), 0];
  }

  /** Direcciones de pantalla → ejes del mundo según el azimut de la cámara. */
  function screenAxes(camParams) {
    const az = camParams.azimuth * DEG;
    const fwd = [-Math.cos(az), -Math.sin(az)];      // de la cámara hacia el objetivo (horizontal)
    const right = [fwd[1], -fwd[0]];                 // fwd × up, proyectado en X–Y
    return { right: snapAxis(right[0], right[1]), forward: snapAxis(fwd[0], fwd[1]) };
  }

  const neg = (v) => v.map((x) => -x || 0);

  function keyToCommand(ev, camParams) {
    const k = ev.key;
    const ax = screenAxes(camParams);
    const scene = (action) => ({ kind: 'scene', action });
    const camera = (change) => ({ kind: 'camera', change });
    const app = (cmd) => ({ kind: 'app', cmd });

    if (k === 'ArrowRight') return ev.shiftKey ? null : scene({ type: 'TRANSLATE', delta: ax.right });
    if (k === 'ArrowLeft') return ev.shiftKey ? null : scene({ type: 'TRANSLATE', delta: neg(ax.right) });
    if (k === 'ArrowUp') return scene({ type: 'TRANSLATE', delta: ev.shiftKey ? [0, 0, 1] : ax.forward });
    if (k === 'ArrowDown') return scene({ type: 'TRANSLATE', delta: ev.shiftKey ? [0, 0, -1] : neg(ax.forward) });
    if (k === 'PageUp') return scene({ type: 'TRANSLATE', delta: [0, 0, 1] });
    if (k === 'PageDown') return scene({ type: 'TRANSLATE', delta: [0, 0, -1] });

    switch (k.toLowerCase()) {
      case 'q': return scene({ type: 'ROTATE', axis: 'x', dir: 1 });
      case 'a': return scene({ type: 'ROTATE', axis: 'x', dir: -1 });
      case 'w': return scene({ type: 'ROTATE', axis: 'y', dir: 1 });
      case 's': return scene({ type: 'ROTATE', axis: 'y', dir: -1 });
      case 'e': return scene({ type: 'ROTATE', axis: 'z', dir: 1 });
      case 'd': return scene({ type: 'ROTATE', axis: 'z', dir: -1 });
      case ' ': return scene({ type: 'DROP' });
      case 'j': return camera({ dAzimuth: -5 });
      case 'l': return camera({ dAzimuth: 5 });
      case 'i': return camera({ dElevation: 4 });
      case 'k': return camera({ dElevation: -4 });
      case 'u': return camera({ zoom: 0.9 });
      case 'o': return camera({ zoom: 1 / 0.9 });
      case 'n': return camera({ dFov: -3 });
      case 'm': return camera({ dFov: 3 });
      case 'r': return app('resetCamera');
      case 'v': return app('victory');
      case 'p': return app('demo');
      case 'f': return app('wireframe');
      case 'h': return app('homographyCapture');
      case 't': return app('traceNext');
      case 'backspace': return app('resetScene');
      default: break;
    }
    if (/^[1-9]$/.test(k)) return app('select:' + (Number(k) - 1));
    return null;
  }

  /** Arrastre del ratón → cambio de órbita; rueda → distancia (con Mayús: campo de visión). */
  function dragToCamera(dx, dy) { return { dAzimuth: -dx * 0.35, dElevation: dy * 0.3 }; }
  function wheelToCamera(deltaY, shift) {
    return shift ? { dFov: Math.sign(deltaY) * 2 } : { zoom: Math.exp(deltaY * 0.0012) };
  }

  BO.input = { keyToCommand, screenAxes, dragToCamera, wheelToCamera };
})(globalThis.BO = globalThis.BO || {});
