/*
 * demo.js — Modo de demostración DETERMINISTA.
 * Responsable: Estudiante C (interfaz y animación).
 *
 * La secuencia es una lista fija de eventos con tiempos en segundos. El reloj de la demostración
 * avanza un paso FIJO (1/60 s) por cuadro, independiente del tiempo real, así que la misma
 * secuencia de acciones y poses de cámara se reproduce siempre igual.
 *
 * Tipos de evento:
 *   { t, scene: Action }                        acción enviada a applyAction de la escena
 *   { t, camera: { to:{...}, dur } }            interpolación lineal de parámetros de cámara
 *   { t, cameraReset: dur }                     vuelve a la vista inicial
 *   { t, victory: true }                        inicia la animación de victoria
 *   { t, msg }                                  rótulo mostrado en pantalla
 */
(function (BO) {
  'use strict';

  const STEP = 1 / 60;

  const SCRIPT = [
    { t: 0.0, scene: { type: 'RESET' }, cameraReset: 0, msg: 'Escena principal: contenedor 5×5×10 y pieza activa' },
    { t: 1.2, scene: { type: 'SELECT_PIECE', shapeId: 'Td' }, msg: 'Selección: tornillo derecho (pieza no planaria)' },
    { t: 2.0, scene: { type: 'TRANSLATE', delta: [1, 0, 0] }, msg: 'Traslación en X' },
    { t: 2.6, scene: { type: 'TRANSLATE', delta: [0, -1, 0] }, msg: 'Traslación en Y' },
    { t: 3.2, scene: { type: 'TRANSLATE', delta: [0, 0, -2] }, msg: 'Traslación en Z' },
    { t: 3.9, scene: { type: 'ROTATE', axis: 'x', dir: 1 }, msg: 'Rotación +90° alrededor de X' },
    { t: 4.6, scene: { type: 'ROTATE', axis: 'y', dir: 1 }, msg: 'Rotación +90° alrededor de Y' },
    { t: 5.3, scene: { type: 'ROTATE', axis: 'z', dir: -1 }, msg: 'Rotación −90° alrededor de Z' },
    { t: 6.0, camera: { to: { azimuth: 28 }, dur: 3 }, msg: 'Cámara: órbita alrededor de la escena' },
    { t: 9.0, camera: { to: { elevation: 82 }, dur: 2 }, msg: 'Cámara: vista cenital (como Blockout)' },
    { t: 11.0, camera: { to: { distance: 15 }, dur: 1.5 }, msg: 'Cámara: menor distancia de observación' },
    { t: 12.5, camera: { to: { fovY: 75 }, dur: 1.5 }, msg: 'Campo de visión amplio (focal corta)' },
    { t: 14.0, camera: { to: { fovY: 26, distance: 34 }, dur: 2 }, msg: 'Focal larga + mayor distancia ("dolly zoom")' },
    { t: 16.2, scene: { type: 'DROP' }, msg: 'Soltar: la pieza se fija en el fondo' },
    { t: 16.9, scene: { type: 'SELECT_PIECE', shapeId: 'L' } },
    { t: 17.4, scene: { type: 'ROTATE', axis: 'z', dir: 1 } },
    { t: 17.9, scene: { type: 'TRANSLATE', delta: [-1, 0, 0] } },
    { t: 18.4, scene: { type: 'DROP' } },
    { t: 18.9, scene: { type: 'SELECT_PIECE', shapeId: 'Tr' }, msg: 'Trípode (no planaria)' },
    { t: 19.4, scene: { type: 'ROTATE', axis: 'y', dir: -1 } },
    { t: 19.9, scene: { type: 'TRANSLATE', delta: [1, 1, 0] } },
    { t: 20.4, scene: { type: 'DROP' } },
    { t: 20.6, cameraReset: 1.5, msg: 'Restablecer la vista inicial' },
    { t: 22.5, victory: true, camera: { to: { azimuth: 118, elevation: 30 }, dur: 9 }, msg: 'Animación de victoria (la cámara sigue activa)' },
    { t: 32.0, msg: 'Fin de la demostración' },
  ];
  const DURATION = 33;

  /** Crea el estado del reproductor. */
  function createPlayer() {
    return { time: 0, next: 0, tweens: [], label: '', done: false };
  }

  /**
   * Avanza un paso fijo. `hooks` conecta la demo con la aplicación:
   *   hooks.dispatch(action), hooks.getCamera() -> params, hooks.setCamera(params),
   *   hooks.defaultCamera() -> params, hooks.startVictory()
   */
  function step(player, hooks) {
    if (player.done) return player;
    player.time += STEP;
    const t = player.time;
    while (player.next < SCRIPT.length && SCRIPT[player.next].t <= t + 1e-9) {
      const ev = SCRIPT[player.next++];
      if (ev.msg) player.label = ev.msg;
      if (ev.scene) hooks.dispatch(ev.scene);
      if (ev.cameraReset !== undefined) {
        if (ev.cameraReset === 0) hooks.setCamera(hooks.defaultCamera());
        else player.tweens.push(makeTween(t, hooks.getCamera(), hooks.defaultCamera(), ev.cameraReset));
      }
      if (ev.camera) {
        const from = hooks.getCamera();
        player.tweens.push(makeTween(t, from, Object.assign({}, from, ev.camera.to), ev.camera.dur));
      }
      if (ev.victory) hooks.startVictory();
    }
    player.tweens = player.tweens.filter((tw) => {
      const s = Math.min(1, (t - tw.t0) / tw.dur);
      const cur = hooks.getCamera();
      const p = Object.assign({}, cur);
      tw.keys.forEach((k) => { p[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * s; });
      hooks.setCamera(p);
      return s < 1;
    });
    if (t >= DURATION) player.done = true;
    return player;
  }

  function makeTween(t0, from, to, dur) {
    const keys = ['azimuth', 'elevation', 'distance', 'fovY'].filter((k) => from[k] !== to[k]);
    return { t0, dur, keys, from: Object.assign({}, from), to: Object.assign({}, to) };
  }

  BO.demo = { STEP, SCRIPT, DURATION, createPlayer, step };
})(globalThis.BO = globalThis.BO || {});
