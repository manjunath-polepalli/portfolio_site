/* ==========================================================================
   charts.js — Lightweight, dependency-free Canvas chart engine
   --------------------------------------------------------------------------
   Why hand-rolled? The portfolio ships with zero runtime dependencies so it
   loads instantly and works offline. This module renders crisp,
   HiDPI-aware, animated line / area / bar / donut / sparkline charts and
   supports hover tooltips + prefers-reduced-motion.

   Public API:
     Charts.line(canvas, {series, labels, ...})
     Charts.bar(canvas, {data, labels, ...})
     Charts.donut(canvas, {data, ...})
     Charts.sparkline(canvas, {data, color})
   Each returns a controller with .update(newData) and .destroy().
   ========================================================================== */
const Charts = (() => {
  const PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#0EA5E9', '#DC2626'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return (Math.round(n * 10) / 10).toLocaleString();
  };

  /* Configure a canvas for crisp HiDPI rendering and return its 2D context. */
  function setup(canvas, h) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
    const cssH = h || canvas.clientHeight || 240;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: cssW, h: cssH, dpr };
  }

  /* requestAnimationFrame tween helper (0 → 1 with ease-out). */
  function animate(draw, dur = 850) {
    if (reduceMotion) { draw(1); return () => {}; }
    let raf, start;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / dur);
      draw(ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }

  /* ----- shared tooltip element (one per page) ----- */
  let tip;
  function tooltip() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.style.cssText =
      'position:fixed;z-index:500;pointer-events:none;background:#0F172A;color:#fff;' +
      'font:600 12px/1.4 "JetBrains Mono",monospace;padding:7px 10px;border-radius:8px;' +
      'box-shadow:0 8px 24px rgba(15,23,42,.25);opacity:0;transition:opacity .15s;white-space:nowrap;transform:translate(-50%,-115%)';
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(x, y, html) { const t = tooltip(); t.innerHTML = html; t.style.left = x + 'px'; t.style.top = y + 'px'; t.style.opacity = '1'; }
  function hideTip() { if (tip) tip.style.opacity = '0'; }

  /* ============================ LINE / AREA ============================== */
  function line(canvas, opts) {
    const pad = { t: 18, r: 16, b: 28, l: 40 };
    let { series, labels = [], area = true, height } = opts;
    let hoverIdx = -1, stop;

    function render(progress = 1) {
      const { ctx, w, h } = setup(canvas, height);
      ctx.clearRect(0, 0, w, h);
      const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
      const all = series.flatMap((s) => s.data);
      const max = Math.max(...all) * 1.12, min = Math.min(0, ...all);
      const xAt = (i) => pad.l + (plotW * i) / (labels.length - 1 || 1);
      const yAt = (v) => pad.t + plotH - ((v - min) / (max - min || 1)) * plotH;

      // gridlines + y labels
      ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#94A3B8'; ctx.textAlign = 'right';
      for (let g = 0; g <= 4; g++) {
        const val = min + ((max - min) * g) / 4, y = yAt(val);
        ctx.strokeStyle = '#EEF2F7'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
        ctx.fillText(fmt(val), pad.l - 8, y + 4);
      }
      // x labels (auto-skip on small width)
      ctx.textAlign = 'center';
      const skip = Math.ceil(labels.length / (plotW > 480 ? 12 : 6));
      labels.forEach((lb, i) => { if (i % skip === 0) ctx.fillText(lb, xAt(i), h - 8); });

      // each series
      series.forEach((s, si) => {
        const color = s.color || PALETTE[si % PALETTE.length];
        const pts = s.data.map((v, i) => [xAt(i), yAt(min + (v - min) * progress)]);
        if (area && si === 0) {
          const grd = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
          grd.addColorStop(0, color + '33'); grd.addColorStop(1, color + '02');
          ctx.beginPath(); ctx.moveTo(pts[0][0], yAt(min));
          pts.forEach((p) => ctx.lineTo(p[0], p[1]));
          ctx.lineTo(pts[pts.length - 1][0], yAt(min)); ctx.closePath();
          ctx.fillStyle = grd; ctx.fill();
        }
        ctx.beginPath(); ctx.lineWidth = 2.5; ctx.strokeStyle = color;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        // hover marker
        if (hoverIdx >= 0 && progress === 1) {
          const p = pts[hoverIdx];
          ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
        }
      });
      // hover guide line
      if (hoverIdx >= 0 && progress === 1) {
        ctx.strokeStyle = '#CBD5E1'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(xAt(hoverIdx), pad.t); ctx.lineTo(xAt(hoverIdx), h - pad.b); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      const plotW = r.width - pad.l - pad.r;
      const i = Math.round(((e.clientX - r.left - pad.l) / plotW) * (labels.length - 1));
      if (i < 0 || i >= labels.length) { if (hoverIdx !== -1) { hoverIdx = -1; render(1); hideTip(); } return; }
      if (i !== hoverIdx) {
        hoverIdx = i; render(1);
        const rows = series.map((s) => `<span style="color:${s.color || PALETTE[series.indexOf(s) % PALETTE.length]}">●</span> ${s.name}: ${fmt(s.data[i])}`).join('<br>');
        showTip(e.clientX, r.top + pad.t + 10, `${labels[i]}<br>${rows}`);
      }
    }
    function onLeave() { hoverIdx = -1; render(1); hideTip(); }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    stop = animate(render);
    const ro = new ResizeObserver(() => render(1)); ro.observe(canvas);
    return {
      update(newSeries, newLabels) { series = newSeries; if (newLabels) labels = newLabels; stop && stop(); stop = animate(render); },
      destroy() { stop && stop(); ro.disconnect(); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseleave', onLeave); }
    };
  }

  /* ================================ BAR ================================= */
  function bar(canvas, opts) {
    const pad = { t: 16, r: 12, b: 28, l: 40 };
    let { data, labels = [], color = PALETTE[0], height, horizontal = false } = opts;
    let hover = -1, stop;

    function render(progress = 1) {
      const { ctx, w, h } = setup(canvas, height);
      ctx.clearRect(0, 0, w, h);
      const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
      const max = Math.max(...data) * 1.12;
      ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#94A3B8';

      if (!horizontal) {
        for (let g = 0; g <= 4; g++) {
          const y = pad.t + (plotH * g) / 4;
          ctx.strokeStyle = '#EEF2F7'; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
          ctx.textAlign = 'right'; ctx.fillText(fmt(max - (max * g) / 4), pad.l - 8, y + 4);
        }
        const bw = (plotW / data.length) * 0.6, gap = (plotW / data.length) * 0.4;
        data.forEach((v, i) => {
          const x = pad.l + i * (bw + gap) + gap / 2;
          const bh = (v / max) * plotH * progress;
          const y = pad.t + plotH - bh;
          const grd = ctx.createLinearGradient(0, y, 0, pad.t + plotH);
          grd.addColorStop(0, hover === i ? '#1D4ED8' : color); grd.addColorStop(1, color + 'AA');
          ctx.fillStyle = grd; roundRect(ctx, x, y, bw, bh, 6); ctx.fill();
          ctx.fillStyle = '#94A3B8'; ctx.textAlign = 'center';
          ctx.fillText(labels[i] ?? '', x + bw / 2, h - 8);
        });
      } else {
        const bh = (plotH / data.length) * 0.62, gap = (plotH / data.length) * 0.38;
        data.forEach((v, i) => {
          const y = pad.t + i * (bh + gap) + gap / 2;
          const bw = (v / max) * plotW * progress;
          ctx.fillStyle = hover === i ? '#1D4ED8' : (Array.isArray(color) ? color[i % color.length] : color);
          roundRect(ctx, pad.l, y, bw, bh, 6); ctx.fill();
          ctx.fillStyle = '#475569'; ctx.textAlign = 'left'; ctx.font = '600 11px Inter';
          ctx.fillText(labels[i] ?? '', pad.l + 6, y + bh / 2 + 4);
          ctx.fillStyle = '#0F172A'; ctx.textAlign = 'right';
          ctx.fillText(fmt(v), w - pad.r, y + bh / 2 + 4);
        });
      }
    }
    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      const plotW = r.width - pad.l - pad.r;
      const i = Math.floor(((e.clientX - r.left - pad.l) / plotW) * data.length);
      if (i >= 0 && i < data.length) { if (i !== hover) { hover = i; render(1); } showTip(e.clientX, r.top + 16, `${labels[i] ?? ''}: <b>${fmt(data[i])}</b>`); }
      else if (hover !== -1) { hover = -1; render(1); hideTip(); }
    }
    function onLeave() { hover = -1; render(1); hideTip(); }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    stop = animate(render);
    const ro = new ResizeObserver(() => render(1)); ro.observe(canvas);
    return {
      update(d, l) { data = d; if (l) labels = l; stop && stop(); stop = animate(render); },
      destroy() { stop && stop(); ro.disconnect(); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseleave', onLeave); }
    };
  }

  /* =============================== DONUT ================================ */
  function donut(canvas, opts) {
    let { data, labels = [], colors = PALETTE, height, centerLabel = '' } = opts;
    let hover = -1, stop;
    function render(progress = 1) {
      const { ctx, w, h } = setup(canvas, height);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8, r = R * 0.62;
      const total = data.reduce((a, b) => a + b, 0) || 1;
      let ang = -Math.PI / 2;
      data.forEach((v, i) => {
        const slice = (v / total) * Math.PI * 2 * progress;
        ctx.beginPath();
        const rr = hover === i ? R + 4 : R;
        ctx.moveTo(cx, cy); ctx.arc(cx, cy, rr, ang, ang + slice); ctx.closePath();
        ctx.fillStyle = colors[i % colors.length]; ctx.fill();
        ang += slice;
      });
      // punch hole
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // center text
      ctx.fillStyle = '#0F172A'; ctx.textAlign = 'center';
      ctx.font = '700 22px "Space Grotesk", sans-serif';
      const big = hover >= 0 ? Math.round((data[hover] / total) * 100) + '%' : centerLabel || fmt(total);
      ctx.fillText(big, cx, cy + 2);
      ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter';
      ctx.fillText(hover >= 0 ? labels[hover] : 'total', cx, cy + 20);
    }
    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      const cx = r.width / 2, cy = (canvas.clientHeight || r.height) / 2;
      const dx = e.clientX - r.left - cx, dy = e.clientY - r.top - cy;
      let a = Math.atan2(dy, dx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
      const total = data.reduce((s, b) => s + b, 0) || 1;
      let acc = 0, found = -1;
      for (let i = 0; i < data.length; i++) { const slice = (data[i] / total) * Math.PI * 2; if (a >= acc && a < acc + slice) { found = i; break; } acc += slice; }
      if (found !== hover) { hover = found; render(1); }
      if (found >= 0) showTip(e.clientX, r.top + 10, `${labels[found]}: <b>${fmt(data[found])}</b>`); else hideTip();
    }
    function onLeave() { hover = -1; render(1); hideTip(); }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    stop = animate(render);
    const ro = new ResizeObserver(() => render(1)); ro.observe(canvas);
    return {
      update(d) { data = d; stop && stop(); stop = animate(render); },
      destroy() { stop && stop(); ro.disconnect(); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseleave', onLeave); }
    };
  }

  /* ============================= SPARKLINE ============================== */
  function sparkline(canvas, { data, color = PALETTE[0], height = 44 }) {
    const { ctx, w, h } = setup(canvas, height);
    const max = Math.max(...data), min = Math.min(...data);
    const xAt = (i) => (w * i) / (data.length - 1);
    const yAt = (v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8);
    animate((p) => {
      ctx.clearRect(0, 0, w, h);
      const n = Math.max(2, Math.floor(data.length * p));
      ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.lineJoin = 'round';
      for (let i = 0; i < n; i++) (i ? ctx.lineTo(xAt(i), yAt(data[i])) : ctx.moveTo(xAt(i), yAt(data[i])));
      ctx.stroke();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, color + '30'); grd.addColorStop(1, color + '00');
      ctx.lineTo(xAt(n - 1), h); ctx.lineTo(0, h); ctx.closePath(); ctx.fillStyle = grd; ctx.fill();
    }, 700);
    return {};
  }

  /* helper: rounded rectangle path */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { line, bar, donut, sparkline, PALETTE, fmt };
})();
