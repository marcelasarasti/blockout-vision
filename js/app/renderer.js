/*
 * renderer.js — Dibujo 2D de DrawPrimitives2D en un <canvas>.
 * Responsable: Estudiante C (interfaz y animación).
 *
 * Este módulo SOLO dibuja coordenadas (u, v) ya calculadas por la proyección:
 * no conoce matrices ni coordenadas 3D. El sombreado usa la normal del mundo que trae
 * cada polígono (luz direccional fija en el mundo).
 */
(function (BO) {
  'use strict';

  const LINE_STYLES = {
    floor: { color: 'rgba(94, 182, 255, 0.55)', width: 1 },
    wall: { color: 'rgba(94, 182, 255, 0.20)', width: 1 },
    corner: { color: 'rgba(120, 200, 255, 0.75)', width: 1.4 },
    rim: { color: 'rgba(150, 215, 255, 0.95)', width: 1.8 },
    axisX: { color: '#ff6b6b', width: 2.6, label: 'X' },
    axisY: { color: '#69f0ae', width: 2.6, label: 'Y' },
    axisZ: { color: '#74a9ff', width: 2.6, label: 'Z' },
  };
  const LIGHT = (() => { const v = [0.35, -0.55, 0.9]; const n = Math.hypot(...v); return v.map((x) => x / n); })();

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, k) {
    const [r, g, b] = hexToRgb(hex);
    return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  }

  function clear(ctx, w, h) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#0f1b2e');
    g.addColorStop(1, '#05080f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /** Dibuja las primitivas (ya ordenadas de lejos a cerca). */
  function drawPrimitives(ctx, prims, opts) {
    const o = opts || {};
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const p of prims) {
      if (p.type === 'polygon') {
        const n = p.normalWorld;
        const lambert = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
        const k = 0.42 + 0.58 * lambert;
        const dim = o.dimObjects && o.dimObjects.has(p.objectId);
        ctx.beginPath();
        ctx.moveTo(p.points[0][0], p.points[0][1]);
        for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i][0], p.points[i][1]);
        ctx.closePath();
        ctx.globalAlpha = dim ? 0.35 : 1;
        ctx.fillStyle = shade(p.color, k);
        ctx.fill();
        ctx.strokeStyle = shade(p.color, 0.28);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        const st = LINE_STYLES[p.style];
        ctx.beginPath();
        ctx.moveTo(p.a[0], p.a[1]);
        ctx.lineTo(p.b[0], p.b[1]);
        if (st) { ctx.strokeStyle = st.color; ctx.lineWidth = st.width; }
        else { ctx.strokeStyle = p.color || '#ffffff'; ctx.lineWidth = p.style === 'active' ? 2.2 : 1.6; }
        ctx.stroke();
        if (st && st.label) {
          ctx.fillStyle = st.color;
          ctx.font = '600 12px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillText(st.label, p.b[0] + 4, p.b[1] - 4);
        }
      }
    }
  }

  function marker(ctx, p, kind, color, size = 6) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (kind === 'circle') ctx.arc(p[0], p[1], size, 0, 2 * Math.PI);
    else { // cruz
      ctx.moveTo(p[0] - size, p[1] - size); ctx.lineTo(p[0] + size, p[1] + size);
      ctx.moveTo(p[0] + size, p[1] - size); ctx.lineTo(p[0] - size, p[1] + size);
    }
    ctx.stroke();
  }

  /** Superpone el experimento de homografía: círculo = proyección real, cruz = H·x1. */
  function drawHomography(ctx, rows) {
    rows.forEach((r) => {
      if (!r.p2 || !r.p2H) return;
      const col = r.onPlane ? '#69f0ae' : '#ff9f43';
      if (!r.onPlane) {
        ctx.strokeStyle = 'rgba(255, 90, 90, 0.9)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(r.p2[0], r.p2[1]); ctx.lineTo(r.p2H[0], r.p2H[1]); ctx.stroke();
        ctx.setLineDash([]);
      }
      marker(ctx, r.p2, 'circle', col, 7);
      marker(ctx, r.p2H, 'cross', r.onPlane ? '#ffffff' : '#ff5a5a', 5);
    });
  }

  function drawTrace(ctx, uv) {
    if (!uv) return;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(uv[0], uv[1], 9, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = '#ff2e88';
    ctx.beginPath(); ctx.arc(uv[0], uv[1], 4, 0, 2 * Math.PI); ctx.stroke();
  }

  function drawHud(ctx, w, h, lines) {
    ctx.font = '500 13px "JetBrains Mono", ui-monospace, monospace';
    lines.forEach((ln, i) => {
      ctx.fillStyle = ln.color || 'rgba(200, 225, 255, 0.85)';
      ctx.fillText(ln.text, 16, 26 + i * 20);
    });
    ctx.fillStyle = 'rgba(160, 190, 230, 0.55)';
    ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('λ·[u v 1]ᵀ = K [R | t] M [X Y Z 1]ᵀ', 16, h - 16);
  }

  BO.renderer = { clear, drawPrimitives, drawHomography, drawTrace, drawHud, LINE_STYLES };
})(globalThis.BO = globalThis.BO || {});
