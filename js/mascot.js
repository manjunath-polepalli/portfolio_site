/* ==========================================================================
   mascot.js — "Nova", a friendly animated site-guide bot
   --------------------------------------------------------------------------
   What changed vs. the old bot:
     • Cuter, happier character — round body, big sparkly eyes, big smile,
       rosy cheeks, glowing antenna, waving arms.
     • Actually MOVES: rides down the page as you scroll (the fixed "dock"
       gets a transform driven by scroll progress + a gentle bob), so its
       motion never fights the bot's own hover/bounce transforms.
     • DRAGGABLE: grab and drop it anywhere; double-click snaps it home.
     • Proactively HIGHLIGHTS the page: as each section (and each individual
       experience entry) scrolls into view, Nova pops a short highlight.
     • Click opens a panel with page highlights + a mini ask box wired to the
       same Assistant brain as the chat (window.Assistant).
   Respects prefers-reduced-motion throughout.
   ========================================================================== */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* section highlights (shown automatically as you scroll) */
  const TIPS = {
    top:       { i: '👋', t: "Hi, I'm Nova!", d: "I'll ride along and point out the good stuff. Grab me and drag me anywhere — or tap for highlights." },
    snapshot:  { i: '⚡', t: 'Recruiter snapshot', d: 'Quick facts up top: current role, target roles, top skills and location — everything at a glance.' },
    expertise: { i: '🧩', t: 'Core expertise', d: 'Six pillars from full-stack to Azure cloud and AI. Hover any card to see it glow.' },
    work:      { i: '🚀', t: 'Live demos', d: 'Five real, working demos. Hit “Launch demo” to actually use them in your browser!' },
    games:     { i: '🎮', t: 'Mini-games', d: 'Three 30-second games with leaderboards. Can you earn a gold badge?' },
    live:      { i: '📡', t: 'Live data', d: 'These cards pull real-time weather, markets and trending repos — and you can chat with the assistant.' },
    impact:    { i: '📈', t: 'Measured impact', d: 'Real, quantified results — charts animate as they scroll in.' },
    about:     { i: '💼', t: 'Career roadmap', d: "Follow the path start → now: Ventro intern → SWOT developer → Azure @ Rivier (+ M.S.) → Azure Engineer @ T-Mobile." },
    contact:   { i: '📨', t: "Let's connect", d: 'Hiring? The form replies within 24h, or email/LinkedIn are right here.' },
  };
  const TOUR = ['top', 'snapshot', 'expertise', 'work', 'games', 'live', 'impact', 'about', 'contact'];

  /* ---------- build dock + bot + bubble ---------- */
  const dock = document.createElement('div');
  dock.className = 'mascot-dock';
  dock.id = 'mascotDock';
  dock.innerHTML = `
    <span class="hint" aria-hidden="true"></span>
    <button class="mascot" id="mascot" aria-label="Nova — your site guide. Tap for highlights, drag to move.">
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id="novaBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#6D6BFB"/><stop offset=".55" stop-color="#8B5CF6"/><stop offset="1" stop-color="#D946EF"/>
          </linearGradient>
          <radialGradient id="novaFace" cx="42%" cy="36%" r="72%">
            <stop offset="0" stop-color="#F1F5FF"/><stop offset="1" stop-color="#BAE6FD"/>
          </radialGradient>
          <radialGradient id="novaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#E879F9" stop-opacity=".9"/><stop offset="1" stop-color="#E879F9" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <!-- soft glow -->
        <circle cx="60" cy="62" r="52" fill="url(#novaGlow)" opacity=".35"/>
        <!-- spinning dashed halo -->
        <circle class="ring" cx="60" cy="60" r="52" fill="none" stroke="#C4B5FD" stroke-width="2.5" stroke-dasharray="3 12" stroke-linecap="round"/>
        <g class="body-grp">
          <!-- antenna -->
          <line x1="60" y1="24" x2="60" y2="13" stroke="#8B5CF6" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="60" cy="10" r="5" fill="#F472B6"><animate attributeName="r" values="5;6;5" dur="1.6s" repeatCount="indefinite"/></circle>
          <!-- waving arms -->
          <path class="arm-l" d="M26 64 Q14 66 13 78" fill="none" stroke="url(#novaBody)" stroke-width="7" stroke-linecap="round"/>
          <path class="arm-r" d="M94 64 Q106 66 107 78" fill="none" stroke="url(#novaBody)" stroke-width="7" stroke-linecap="round"/>
          <!-- round body -->
          <rect x="22" y="30" width="76" height="64" rx="32" fill="url(#novaBody)"/>
          <!-- face glass -->
          <ellipse cx="60" cy="58" rx="30" ry="25" fill="url(#novaFace)"/>
          <!-- big happy eyes -->
          <g>
            <circle cx="49" cy="56" r="6.5" fill="#191636"/>
            <circle cx="71" cy="56" r="6.5" fill="#191636"/>
            <circle cx="51.4" cy="53.4" r="2.4" fill="#fff"/>
            <circle cx="73.4" cy="53.4" r="2.4" fill="#fff"/>
            <circle cx="47.4" cy="58.6" r="1.2" fill="#fff" opacity=".8"/>
            <circle cx="69.4" cy="58.6" r="1.2" fill="#fff" opacity=".8"/>
            <rect class="eye-lid" x="42.5" y="50" width="13" height="13" rx="6.5" fill="url(#novaFace)"/>
            <rect class="eye-lid" x="64.5" y="50" width="13" height="13" rx="6.5" fill="url(#novaFace)"/>
          </g>
          <!-- big smile -->
          <path d="M50 66 Q60 76 70 66" fill="none" stroke="#191636" stroke-width="3" stroke-linecap="round"/>
          <!-- rosy cheeks -->
          <circle cx="41" cy="65" r="4" fill="#FB7BC4" opacity=".75"/>
          <circle cx="79" cy="65" r="4" fill="#FB7BC4" opacity=".75"/>
          <!-- little feet -->
          <ellipse cx="48" cy="96" rx="9" ry="5" fill="#6D6BFB"/>
          <ellipse cx="72" cy="96" rx="9" ry="5" fill="#6D6BFB"/>
        </g>
      </svg>
    </button>`;
  document.body.appendChild(dock);
  const btn = dock.querySelector('#mascot');

  const bubble = document.createElement('div');
  bubble.className = 'mascot-bubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  dock.appendChild(bubble);

  /* ---------- speech bubble rendering ---------- */
  let bubbleTimer, dismissedUntil = 0;
  function showBubble(html, autoHideMs) {
    bubble.innerHTML = html;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    if (autoHideMs) bubbleTimer = setTimeout(hide, autoHideMs);
    bounce();
  }
  function hide() { bubble.classList.remove('show'); }
  function bounce() { if (reduce) return; btn.classList.remove('is-happy'); void btn.offsetWidth; btn.classList.add('is-happy'); }
  function wave() { if (reduce) return; btn.classList.add('is-wave'); setTimeout(() => btn.classList.remove('is-wave'), 1300); }

  function tipHTML(key) {
    const t = TIPS[key] || TIPS.top;
    return `<h5>${t.i} ${t.t}</h5><p>${t.d}</p>
      <div class="b-actions">
        <button class="b-go" data-go="${nextSel(key)}">${key === 'contact' ? 'Back to top' : 'Show me ›'}</button>
        <button class="b-next">More tips</button>
      </div>`;
  }
  function nextSel(key) { const i = TOUR.indexOf(key); return key === 'contact' ? '#top' : '#' + (TOUR[i + 1] || 'work'); }

  function openTip(key) {
    showBubble(tipHTML(key), 0);
    bubble.querySelector('.b-go').addEventListener('click', () => { const d = document.querySelector(bubble.querySelector('.b-go').dataset.go); if (d) d.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); hide(); });
    bubble.querySelector('.b-next').addEventListener('click', () => openPanel());
  }

  /* rich panel: quick page highlights / jump links */
  function openPanel() {
    wave();
    showBubble(`
      <h5>✨ Page highlights</h5>
      <p style="margin-bottom:8px">Let me show you around — jump anywhere:</p>
      <div class="b-actions" style="flex-wrap:wrap">
        <button class="b-next" data-go="#live">📡 Live data</button>
        <button class="b-next" data-go="#games">🎮 Games</button>
        <button class="b-next" data-go="#work">🚀 Projects</button>
        <button class="b-next" data-go="#about">💼 My journey</button>
        <button class="b-go" data-go="#contact">📨 Hire me</button>
      </div>`, 0);
    bubble.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { const d = document.querySelector(b.dataset.go); if (d) d.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); hide(); }));
  }

  /* ---------- click + outside-dismiss ---------- */
  let dragMoved = false;
  btn.addEventListener('click', () => {
    if (dragMoved) { dragMoved = false; return; }   // ignore click that ended a drag
    if (bubble.classList.contains('show')) { hide(); return; }
    wave(); openPanel();
  });
  document.addEventListener('click', (e) => { if (!dock.contains(e.target)) hide(); });

  /* ---------- DRAGGABLE (pixel positioning, no transform clash) ---------- */
  let dragging = false, sx, sy, startLeft = 0, startTop = 0, userMoved = false;
  function onDown(e) {
    dragging = true; dragMoved = false; dock.classList.add('dragging');
    const p = e.touches ? e.touches[0] : e;
    const r = dock.getBoundingClientRect();
    // switch from the centered transform to explicit pixel coords for dragging
    dock.style.transition = 'none';
    dock.style.left = r.left + 'px'; dock.style.top = r.top + 'px';
    dock.style.right = 'auto'; dock.style.bottom = 'auto'; dock.style.transform = 'none';
    startLeft = r.left; startTop = r.top; sx = p.clientX; sy = p.clientY;
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - sx, dy = p.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) { dragMoved = true; userMoved = true; }
    dock.style.left = (startLeft + dx) + 'px';
    dock.style.top = (startTop + dy) + 'px';
  }
  function onUp() { dragging = false; dock.classList.remove('dragging'); dock.style.transition = ''; }
  btn.addEventListener('mousedown', onDown);
  btn.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);
  // double-click snaps Nova back home (clear all inline positioning)
  btn.addEventListener('dblclick', () => { userMoved = false; dock.removeAttribute('style'); bounce(); });

  /* Nova stays put at the bottom-right corner with a gentle idle float/blink
     (CSS only). No scroll-triggered movement or auto-popups — the window
     opens ONLY when you click the bot, so it never feels nonfunctional. */

  /* ---------- public API for other modules ---------- */
  window.Pixel = window.Nova = {
    say(key) { openTip(key); },
    cheer() { bounce(); },
    custom(title, text) { showBubble(`<h5>${title}</h5><p>${text}</p>`, 5000); },
  };
})();
