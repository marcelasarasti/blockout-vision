/*
 * main.js — Aplicación: estado de la interfaz, bucle de animación y paneles.
 * Responsable: Estudiante C (interfaz y animación).
 *
 * Flujo por cuadro:
 *   entrada → acciones → applyAction (escena)        [módulo A]
 *   parámetros de cámara → buildCamera → K, R, t      [módulo B]
 *   getGeometry(escena) → project(geom, cámara)        [A → B]
 *   DrawPrimitives2D → canvas                          [módulo C]
 */
(function (BO) {
  'use strict';
  const L = BO.linalg, P = BO.pieces, S = BO.scene, CAM = BO.camera, PR = BO.projection,
    HG = BO.homography, RD = BO.renderer, IN = BO.input, VIC = BO.victory, DEMO = BO.demo;
  const $ = (id) => document.getElementById(id);
  const f = (x, d = 2) => L.fmt(x, d);
  const vec = (v, d = 2) => '(' + v.map((x) => f(x, d)).join(', ') + ')';
  const matText = (A, d = 3) => {
    const cols = A[0].map((_, j) => Math.max(...A.map((r) => f(r[j], d).length)));
    return A.map((r) => '[ ' + r.map((x, j) => f(x, d).padStart(cols[j])).join('  ') + ' ]').join('\n');
  };

  // ---------------- estado de la aplicación (propiedad del módulo C) ----------------
  const app = {
    scene: S.createScene(),
    cam: null,                 // CameraParams (sin width/height: se toman del lienzo)
    wireframe: false,
    h1: null,                  // cámara fijada como "vista 1" para la homografía
    traceIdx: 0,
    victoryT: null,            // segundos transcurridos de la animación de victoria
    demo: null,                // reproductor de la demostración
    last: 0,
    size: { w: 960, h: 720 },
    uiTick: 0,
    lastHomography: null,
  };
  app.cam = CAM.defaultCameraParams(app.scene.config);

  const canvas = $('view');
  const ctx = canvas.getContext('2d');

  function camera() {
    return CAM.buildCamera(Object.assign({}, app.cam, { width: app.size.w, height: app.size.h }));
  }

  // ---------------- acciones ----------------
  function dispatch(action) {
    app.scene = S.applyAction(app.scene, action);
  }
  function changeCamera(change) {
    app.cam = CAM.updateCameraParams(app.cam, change);
  }
  function startVictory() {
    app.victoryT = 0;
  }
  function stopVictory() {
    app.victoryT = null;
    dispatch({ type: 'CLEAR_ANIMATION' });
  }
  function toggleDemo() {
    if (app.demo) { app.demo = null; stopVictory(); setStatus('Demostración detenida', true); return; }
    stopVictory();
    app.demo = DEMO.createPlayer();
  }

  const demoHooks = {
    dispatch,
    getCamera: () => Object.assign({}, app.cam),
    setCamera: (p) => { app.cam = CAM.updateCameraParams(p, {}); },
    defaultCamera: () => CAM.defaultCameraParams(app.scene.config),
    startVictory,
  };

  function runApp(cmd) {
    if (cmd === 'demo') return toggleDemo();
    if (app.demo) return; // durante la demostración solo se admite detenerla
    if (cmd === 'resetCamera') app.cam = CAM.defaultCameraParams(app.scene.config);
    else if (cmd === 'victory') app.victoryT === null ? startVictory() : stopVictory();
    else if (cmd === 'wireframe') app.wireframe = !app.wireframe;
    else if (cmd === 'homographyCapture') { app.h1 = camera(); }
    else if (cmd === 'traceNext') app.traceIdx++;
    else if (cmd === 'resetScene') { stopVictory(); dispatch({ type: 'RESET' }); }
    else if (cmd.startsWith('select:')) {
      const p = P.PIECES[Number(cmd.slice(7))];
      if (p && app.victoryT === null) dispatch({ type: 'SELECT_PIECE', shapeId: p.id });
    }
  }

  function handleCommand(c) {
    if (!c) return false;
    if (c.kind === 'app') runApp(c.cmd);
    else if (app.demo) return true;
    else if (c.kind === 'camera') changeCamera(c.change);
    else if (c.kind === 'scene' && app.victoryT === null) dispatch(c.action);
    return true;
  }

  // ---------------- entrada ----------------
  window.addEventListener('keydown', (ev) => {
    if (ev.target && ev.target.tagName === 'INPUT') return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (handleCommand(IN.keyToCommand(ev, app.cam))) ev.preventDefault();
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => { drag = { x: ev.clientX, y: ev.clientY }; canvas.setPointerCapture(ev.pointerId); canvas.classList.add('dragging'); });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag || app.demo) return;
    changeCamera(IN.dragToCamera(ev.clientX - drag.x, ev.clientY - drag.y));
    drag = { x: ev.clientX, y: ev.clientY };
  });
  const endDrag = () => { drag = null; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); if (!app.demo) changeCamera(IN.wheelToCamera(ev.deltaY, ev.shiftKey)); }, { passive: false });

  $('btn-demo').onclick = () => runApp('demo');
  $('btn-victory').onclick = () => runApp('victory');
  $('btn-wire').onclick = () => runApp('wireframe');
  $('btn-reset-scene').onclick = () => runApp('resetScene');
  $('btn-reset-cam').onclick = () => runApp('resetCamera');
  $('trace-next').onclick = () => runApp('traceNext');
  $('trace-prev').onclick = () => { if (!app.demo) app.traceIdx--; };
  $('h-capture').onclick = () => runApp('homographyCapture');
  $('h-clear').onclick = () => { app.h1 = null; };
  document.querySelectorAll('[data-act]').forEach((b) => {
    b.onclick = () => handleCommand({ kind: 'scene', action: JSON.parse(b.dataset.act) });
  });

  // Selector de piezas
  const grid = $('piece-grid');
  P.PIECES.forEach((p, i) => {
    const b = document.createElement('button');
    b.dataset.shape = p.id;
    b.title = p.name + (p.planar ? ' (planaria)' : ' (no planaria)');
    b.innerHTML = `<span class="sw" style="background:${p.color}"></span><span>${i + 1} · ${p.name}</span>` +
      (p.planar ? '' : '<span class="np">3D</span>');
    b.onclick = () => runApp('select:' + i);
    grid.appendChild(b);
  });

  // Deslizadores de cámara
  const SLIDERS = ['azimuth', 'elevation', 'distance', 'fovY'];
  SLIDERS.forEach((k) => {
    $('cam-' + k).addEventListener('input', (ev) => {
      if (app.demo) return;
      app.cam = CAM.updateCameraParams(app.cam, { set: { [k]: Number(ev.target.value) } });
    });
  });

  // ---------------- dibujo ----------------
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(200, Math.round(r.width)), h = Math.max(200, Math.round(r.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    app.size = { w, h };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function traceTarget(geom) {
    const obj = geom.objects.find((o) => o.id === 'active') || geom.objects.find((o) => o.kind === 'anim');
    if (!obj) return null;
    const n = obj.vertices.length;
    const idx = ((app.traceIdx % n) + n) % n;
    return { obj, idx, X: obj.vertices[idx] };
  }

  function frame(now) {
    const dtReal = app.last ? Math.min(0.05, (now - app.last) / 1000) : 0;
    app.last = now;
    // Reloj: paso fijo durante la demostración (determinista), tiempo real fuera de ella.
    const dt = app.demo ? DEMO.STEP : dtReal;
    if (app.demo) {
      DEMO.step(app.demo, demoHooks);
      if (app.demo.done) { app.demo = null; setStatus('Demostración terminada', true); }
    }
    if (app.victoryT !== null) {
      const poses = VIC.posesAt(app.victoryT, app.scene.config);
      if (poses) dispatch({ type: 'SET_ANIMATION', pieces: poses });
      else { stopVictory(); setStatus('¡Victoria!', true); }
      if (app.victoryT !== null) app.victoryT += dt;
    }

    resize();
    const { w, h } = app.size;
    const cam = camera();
    const geom = S.getGeometry(app.scene);
    const out = PR.project(geom, cam, { faces: !app.wireframe });

    RD.clear(ctx, w, h);
    RD.drawPrimitives(ctx, out.primitives);

    // Homografía: vista 1 fijada vs. cámara actual.
    app.lastHomography = null;
    if (app.h1) {
      const pts = HG.defaultTestPoints(app.scene.config);
      try {
        app.lastHomography = HG.runExperiment(app.h1, cam, pts.plane, pts.off);
        RD.drawHomography(ctx, app.lastHomography.rows);
      } catch (e) { app.lastHomography = { error: e.message }; }
    }

    // Traza de un punto
    const tt = traceTarget(geom);
    const trace = tt ? PR.tracePoint(cam, tt.obj.M, tt.X) : null;
    if (trace) RD.drawTrace(ctx, trace.uv);

    const hud = [
      { text: `${app.wireframe ? 'ARISTAS' : 'CARAS (pintor + caras traseras)'} · ${out.stats.faces} caras · ${out.stats.lines} segmentos · ${out.stats.clipped} recortados` },
    ];
    if (app.demo) hud.push({ text: `DEMO ${app.demo.time.toFixed(1)} s / ${DEMO.DURATION} s — ${app.demo.label}`, color: '#ff2e88' });
    if (app.victoryT !== null) hud.push({ text: `VICTORIA t = ${app.victoryT.toFixed(1)} s`, color: '#ffd166' });
    RD.drawHud(ctx, w, h, hud);

    if (++app.uiTick % 6 === 0) updatePanels(cam, tt, trace);
    if (app.scene.status !== lastStatusObj) { lastStatusObj = app.scene.status; setStatus(app.scene.status.message, app.scene.status.ok); }
    requestAnimationFrame(frame);
  }

  // ---------------- paneles ----------------
  let lastStatusObj = null;
  function setStatus(msg, ok) {
    const el = $('status-strip');
    el.textContent = msg;
    el.classList.toggle('bad', !ok);
  }

  function kv(el, pairs) {
    el.innerHTML = pairs.map(([k, v]) => `<span class="k">${k}</span><span>${v}</span>`).join('');
  }

  function updatePanels(cam, tt, trace) {
    const sc = app.scene;
    const piece = P.getPiece(sc.active.shapeId);
    document.querySelectorAll('#piece-grid button').forEach((b) => b.classList.toggle('on', b.dataset.shape === piece.id));
    $('btn-wire').classList.toggle('on', app.wireframe);
    $('btn-demo').classList.toggle('on', !!app.demo);
    $('btn-victory').classList.toggle('on', app.victoryT !== null);
    kv($('piece-info'), [
      ['pieza', `${piece.name} (${piece.planar ? 'planaria' : 'no planaria'})`],
      ['pivote', `centro de la celda ${vec(piece.pivot, 0)}`],
      ['posición', vec(sc.active.pose.position, 1) + ' (mundo)'],
      ['celdas', S.pieceCells(piece.id, sc.active.pose).map((c) => c.join(',')).join('  ')],
      ['colocadas', `${sc.status.piecesPlaced} piezas · ${sc.placed.length} cubos · ${sc.status.layersCleared} capas`],
    ]);
    $('mat-Rp').textContent = matText(sc.active.pose.rotation, 0);
    $('mat-M').textContent = matText(S.modelMatrix(piece.id, sc.active.pose), 1);

    SLIDERS.forEach((k) => {
      const el = $('cam-' + k);
      if (document.activeElement !== el) el.value = app.cam[k];
      $('o-' + k).textContent = f(app.cam[k], k === 'distance' ? 1 : 0) + (k === 'distance' ? '' : '°');
    });
    kv($('cam-info'), [
      ['centro C', vec(cam.C)],
      ['focal f', `${f(cam.f, 1)} px  (fovY ${f(cam.fovY, 1)}°)`],
      ['imagen', `${cam.width} × ${cam.height} px · near = ${cam.near}`],
    ]);
    $('mat-K').textContent = matText(cam.K, 1);
    $('mat-Rt').textContent = matText(cam.Rt, 3);
    $('mat-P').textContent = matText(cam.P, 1);

    // Traza
    if (tt && trace) {
      $('trace-label').textContent = `vértice ${tt.idx + 1}/${tt.obj.vertices.length} de «${tt.obj.id}»`;
      $('trace-table').innerHTML = [
        ['X (local)', vec(tt.X, 0)],
        ['M·X (mundo)', vec(trace.Xw.slice(0, 3))],
        ['[R|t]·M·X (cámara)', vec(trace.Xc)],
        ['K·Xc = λ[u v 1]', vec(trace.lambdaUV, 1)],
        ['λ = z_c', f(trace.lambda, 3)],
        ['(u, v) px', trace.uv ? vec(trace.uv, 1) : '<span class="r">detrás del plano cercano</span>'],
      ].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');
    }

    // Homografía
    const ho = $('h-out');
    const r = app.lastHomography;
    if (!app.h1) ho.innerHTML = '<p class="note">Sin vista 1 fijada.</p>';
    else if (!r || r.error) ho.innerHTML = `<p class="note r">${r ? r.error : ''}</p>`;
    else {
      const e = (x) => Number.isFinite(x) ? (x < 1e-3 ? x.toExponential(1) : x.toFixed(2)) : '—';
      ho.innerHTML =
        `<div class="sum">línea base ‖C₁ − C₂‖ = ${f(r.baseline, 2)} · posición general: ${r.generalPosition ? 'sí' : 'no'}</div>` +
        `<div class="sum"><span class="g">en el plano</span>: RMS ${e(r.onPlane.rms)} px · máx ${e(r.onPlane.max)} px<br>` +
        `<span class="o">fuera del plano</span>: RMS ${e(r.offPlane.rms)} px · máx ${e(r.offPlane.max)} px</div>` +
        `<div class="mats"><div class="full"><h3>H₂₁ = H_π2 · H_π1⁻¹ (analítica)</h3><pre>${matText(r.H, 4)}</pre></div>` +
        `<div class="full"><h3>H₂₁ estimada por DLT normalizada (Δ relativa ${e(r.dltRelDiff)})</h3><pre>${r.Hdlt ? matText(r.Hdlt, 4) : '—'}</pre></div></div>` +
        '<table><tr><th>punto (mundo)</th><th>u₂ real</th><th>v₂ real</th><th>u₂ H</th><th>v₂ H</th><th>error</th></tr>' +
        r.rows.map((q) => `<tr class="${q.onPlane ? 'g' : 'o'}"><td>${vec(q.X, 1)}</td><td>${q.p2 ? f(q.p2[0], 1) : '—'}</td><td>${q.p2 ? f(q.p2[1], 1) : '—'}</td>` +
          `<td>${q.p2H ? f(q.p2H[0], 1) : '—'}</td><td>${q.p2H ? f(q.p2H[1], 1) : '—'}</td><td>${e(q.error)}</td></tr>`).join('') +
        '</table>';
    }
  }

  // Demostración automática si se abre con  index.html?demo
  if (/[?&]demo\b/.test(location.search)) toggleDemo();
  window.BO_APP = app; // acceso para depuración y pruebas en el navegador
  requestAnimationFrame(frame);
})(globalThis.BO = globalThis.BO || {});
