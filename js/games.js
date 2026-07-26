/* ==========================================================================
   games.js — three quick casual games with leaderboards + badges
   --------------------------------------------------------------------------
   Games (each ~30s):
     echo      — watch the glowing pulse, then repeat the growing sequence
     memory    — flip-and-match pairs against the clock
     twenty48  — slide & merge tiles (2048) for the highest score
   Scores + top-5 leaderboards persist in localStorage. Beating your best
   awards an animated Bronze/Silver/Gold badge + confetti. Pixel cheers.
   Everything mounts into a dedicated glass overlay (separate from the
   project-demo modal).
   ========================================================================== */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LB_KEY = 'pixel.leaderboards.v1';
  const loadLB = () => JSON.parse(localStorage.getItem(LB_KEY) || '{}');
  const saveLB = (lb) => localStorage.setItem(LB_KEY, JSON.stringify(lb));
  const bestOf = (id) => { const lb = loadLB()[id] || []; return lb.length ? lb[0].pts : 0; };

  const GAMES = {
    echo:     { name: 'Echo — Memory Pulse', emoji: '🎵', badges: [4, 7, 11], unit: 'rounds' },
    memory:   { name: 'Memory Match',        emoji: '🧠', dur: 45, badges: [0, 0, 0], unit: 'sec', lowerIsBetter: true },
    twenty48: { name: '2048 — Merge',        emoji: '🔢', badges: [600, 1500, 4000], unit: 'pts' },
  };

  /* ---------- overlay shell ---------- */
  const overlay = document.createElement('div');
  overlay.className = 'game-overlay';
  overlay.id = 'gameOverlay';
  overlay.innerHTML = `
    <div class="game-overlay__scrim" data-close></div>
    <div class="game-stage" role="dialog" aria-modal="true" aria-label="Game">
      <div class="game-head">
        <span class="g-emoji" id="gEmoji" aria-hidden="true">🎮</span>
        <h3 id="gTitle">Game</h3>
        <span class="score" id="gScore"></span>
        <button class="game-close" data-close aria-label="Close game">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="game-body" id="gBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  const $body = overlay.querySelector('#gBody');
  const $score = overlay.querySelector('#gScore');
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) close(); });

  let activeTimer = null, activeRaf = null, extraTimer = null, currentId = null;
  function clearLoops() {
    if (activeTimer) clearInterval(activeTimer);
    if (activeRaf) cancelAnimationFrame(activeRaf);
    if (extraTimer) clearInterval(extraTimer);
    if (overlay._echoKey) { document.removeEventListener('keydown', overlay._echoKey); overlay._echoKey = null; }
    if (overlay._keyHandler) { document.removeEventListener('keydown', overlay._keyHandler); overlay._keyHandler = null; }
    activeTimer = activeRaf = extraTimer = null;
  }

  function open(id) {
    currentId = id;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    overlay.querySelector('#gEmoji').textContent = GAMES[id].emoji;
    overlay.querySelector('#gTitle').textContent = GAMES[id].name;
    startScreen(id);
  }
  function close() {
    clearLoops();
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    $body.innerHTML = ''; $score.textContent = '';
  }

  /* ---------- start / end screens ---------- */
  function startScreen(id) {
    clearLoops(); $score.textContent = '';
    const g = GAMES[id];
    const how = {
      echo: 'Watch the glowing sequence, then repeat it by tapping the pads. Each round adds one more pulse — how far can you echo?',
      memory: 'Flip cards to find all matching pairs. Faster = better.',
      twenty48: 'Swipe or use arrow keys to slide tiles. Equal tiles merge and double — chase 2048 and the highest score!',
    }[id];
    $body.innerHTML = `
      <div class="game-screen">
        <div style="font-size:3rem" aria-hidden="true">${g.emoji}</div>
        <h2>${g.name}</h2>
        <p style="color:var(--text-muted);max-width:300px">${how}</p>
        <p style="font-family:var(--font-mono);font-size:.85rem;color:var(--c-indigo)">⏱ ${g.dur}s &nbsp;·&nbsp; 🏆 best: ${bestOf(id) || '—'} ${g.unit}</p>
        <button class="btn" id="gStart">▶ Start</button>
        ${renderLeaderboard(id)}
      </div>`;
    $body.querySelector('#gStart').addEventListener('click', () => RUNNERS[id]());
  }

  function endScreen(id, score) {
    clearLoops();
    const g = GAMES[id];
    const lb = loadLB();
    const board = lb[id] || [];
    const prevBest = board.length ? board[0].pts : (g.lowerIsBetter ? Infinity : 0);
    const isBest = g.lowerIsBetter ? (score < prevBest) : (score > prevBest);
    // badge tier
    let tier = null;
    if (!g.lowerIsBetter) { if (score >= g.badges[2]) tier = 'gold'; else if (score >= g.badges[1]) tier = 'silver'; else if (score >= g.badges[0]) tier = 'bronze'; }
    else { if (score <= 18) tier = 'gold'; else if (score <= 28) tier = 'silver'; else tier = 'bronze'; }

    $body.innerHTML = `
      <div class="game-screen">
        <h2>${isBest ? '🎉 New record!' : 'Nice run!'}</h2>
        <div class="big-score">${score}<span style="font-size:1.1rem;color:var(--text-muted)"> ${g.unit}</span></div>
        ${tier ? `<span class="badge ${tier}">${tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉'} ${tier[0].toUpperCase() + tier.slice(1)} badge</span>` : ''}
        <div id="gSaveRow"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn--sm" id="gAgain">↻ Play again</button>
          <button class="btn--ghost btn btn--sm" id="gMenu">Leaderboard</button>
        </div>
      </div>`;
    if (window.Pixel) { window.Pixel.cheer(); if (isBest) window.Pixel.custom('New high score! 🏆', `${score} ${g.unit} on ${g.name}. You\'re on a roll!`); }
    if (!reduce && isBest) confetti();

    const saveRow = $body.querySelector('#gSaveRow');
    if (isBest || board.length < 5) {
      saveRow.innerHTML = `<div class="initials-in"><input class="input" id="gInit" maxlength="3" placeholder="ABC" aria-label="Your initials"><button class="btn btn--sm" id="gSave">Save</button></div>`;
      const save = () => {
        const who = ($body.querySelector('#gInit').value || 'YOU').toUpperCase().slice(0, 3);
        const next = [...board, { who, pts: score, t: Date.now() }]
          .sort((a, b) => g.lowerIsBetter ? a.pts - b.pts : b.pts - a.pts).slice(0, 5);
        lb[id] = next; saveLB(lb);
        saveRow.innerHTML = `<p style="color:var(--emerald);font-weight:600">Saved! ✓</p>`;
        // re-show leaderboard
        const old = $body.querySelector('.lb'); if (old) old.outerHTML = renderLeaderboard(id, score);
        else $body.querySelector('.game-screen').insertAdjacentHTML('beforeend', renderLeaderboard(id, score));
      };
      saveRow.querySelector('#gSave').addEventListener('click', save);
      saveRow.querySelector('#gInit').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    }
    $body.querySelector('.game-screen').insertAdjacentHTML('beforeend', renderLeaderboard(id, isBest ? score : null));
    $body.querySelector('#gAgain').addEventListener('click', () => RUNNERS[id]());
    $body.querySelector('#gMenu').addEventListener('click', () => startScreen(id));
  }

  function renderLeaderboard(id, highlightPts) {
    const board = (loadLB()[id] || []);
    const u = GAMES[id].unit;
    if (!board.length) return `<div class="lb"><h4>Leaderboard</h4><p style="color:var(--text-muted);font-size:.85rem">No scores yet — be the first!</p></div>`;
    return `<div class="lb"><h4>🏆 Leaderboard — top 5</h4>${board.map((r, i) =>
      `<div class="lb-row ${highlightPts != null && r.pts === highlightPts ? 'you' : ''}"><span class="rank">${i + 1}</span><span class="who">${r.who}</span><span class="pts">${r.pts} ${u}</span></div>`
    ).join('')}</div>`;
  }

  /* =========================== RUNNERS =========================== */
  const RUNNERS = {};

  /* ---- Echo (Simon-style memory pulse) ---- */
  RUNNERS.echo = function () {
    const PADS = [
      { c: '#06B6D4', lit: '#67E8F9', f: 329.6 },  // cyan
      { c: '#8B3CFF', lit: '#C4A0FF', f: 392.0 },  // violet
      { c: '#E018E0', lit: '#F5A0F5', f: 440.0 },  // fuchsia
      { c: '#F59E0B', lit: '#FCD34D', f: 523.3 },  // amber
    ];
    let seq = [], step = 0, round = 0, accepting = false;
    $score.textContent = 'round 0';
    $body.innerHTML = `
      <div class="echo-wrap">
        <p class="echo-status" id="echoStatus">Watch carefully…</p>
        <div class="echo-grid" id="echoGrid">
          ${PADS.map((p, i) => `<button class="echo-pad" data-i="${i}" aria-label="pad ${i + 1}" style="--pad:${p.c};--lit:${p.lit}"></button>`).join('')}
        </div>
        <p class="echo-hint">Repeat the sequence — keys 1-4 work too.</p>
      </div>`;
    const grid = $body.querySelector('#echoGrid');
    const status = $body.querySelector('#echoStatus');
    const pads = [...grid.querySelectorAll('.echo-pad')];

    // optional delightful beep (guarded; silent if Web Audio unavailable)
    let actx;
    function beep(freq) {
      if (reduce) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.0001, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.16, actx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.32);
        o.start(); o.stop(actx.currentTime + 0.34);
      } catch (e) {}
    }
    function flash(i, dur = 360) {
      pads[i].classList.add('lit'); beep(PADS[i].f);
      setTimeout(() => pads[i].classList.remove('lit'), dur);
    }
    function playSeq() {
      accepting = false; status.textContent = 'Watch carefully…';
      let k = 0;
      const gap = Math.max(280, 620 - round * 25);
      const iv = setInterval(() => {
        if (!overlay.classList.contains('is-open')) { clearInterval(iv); return; }
        flash(seq[k]); k++;
        if (k >= seq.length) { clearInterval(iv); setTimeout(() => { accepting = true; step = 0; status.textContent = 'Your turn! 🔁'; }, gap); }
      }, gap);
      activeTimer = iv;  // so close/clear stops it
    }
    function nextRound() {
      round++; $score.textContent = `round ${round}`;
      seq.push(Math.floor(Math.random() * 4));
      setTimeout(playSeq, 600);
    }
    function press(i) {
      if (!accepting) return;
      flash(i, 200);
      if (i === seq[step]) {
        step++;
        if (step === seq.length) { accepting = false; status.textContent = 'Nice! ✨'; setTimeout(nextRound, 650); }
      } else {
        accepting = false; status.textContent = 'Missed!';
        pads.forEach((p) => p.classList.add('shake'));
        setTimeout(() => endScreen('echo', round - 1), 650);   // completed rounds = round-1
      }
    }
    pads.forEach((p) => p.addEventListener('click', () => press(+p.dataset.i)));
    const onKey = (e) => { if (e.key >= '1' && e.key <= '4') press(+e.key - 1); };
    document.addEventListener('keydown', onKey);
    overlay._echoKey = onKey;       // remove on close
    nextRound();
  };

  /* ---- Memory Match ---- */
  RUNNERS.memory = function () {
    const ICONS = ['🚀', '☁️', '⚡', '🤖', '🔧', '📊', '🛡️', '💾'];
    const deck = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
    let flipped = [], matched = 0, elapsed = 0, lock = false;
    $score.textContent = '0s';
    $body.innerHTML = `<div class="mem-grid" id="mem"></div>`;
    const grid = $body.querySelector('#mem');
    deck.forEach((icon, i) => {
      const c = document.createElement('div');
      c.className = 'mem-card'; c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0');
      c.dataset.icon = icon; c.dataset.i = i;
      c.innerHTML = `<div class="mem-face mem-front"></div><div class="mem-face mem-back">${icon}</div>`;
      const flip = () => {
        if (lock || c.classList.contains('flip') || c.classList.contains('matched')) return;
        c.classList.add('flip'); flipped.push(c);
        if (flipped.length === 2) {
          lock = true;
          const [a, b] = flipped;
          if (a.dataset.icon === b.dataset.icon) {
            setTimeout(() => { a.classList.add('matched'); b.classList.add('matched'); flipped = []; lock = false; matched++; if (matched === ICONS.length) finish(); }, 420);
          } else {
            setTimeout(() => { a.classList.remove('flip'); b.classList.remove('flip'); flipped = []; lock = false; }, 800);
          }
        }
      };
      c.addEventListener('click', flip);
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
      grid.appendChild(c);
    });
    activeTimer = setInterval(() => { elapsed++; $score.textContent = `${elapsed}s`; if (elapsed >= 120) finish(); }, 1000);
    function finish() { clearLoops(); endScreen('memory', elapsed); }
  };

  /* ---- 2048 (merge puzzle) ---- */
  RUNNERS.twenty48 = function () {
    const N = 4;
    let grid = Array.from({ length: N }, () => Array(N).fill(0));
    let score = 0, over = false, won = false;
    $score.textContent = '0 pts';
    $body.innerHTML = `
      <div class="tf-wrap">
        <p class="echo-hint" id="tfMsg">Swipe, or use arrow keys ← ↑ → ↓ (or WASD).</p>
        <div class="tf-board" id="tfBoard"></div>
      </div>`;
    const board = $body.querySelector('#tfBoard');
    const msg = $body.querySelector('#tfMsg');
    const cells = [];
    for (let i = 0; i < N * N; i++) { const c = document.createElement('div'); c.className = 'tf-cell'; c.dataset.v = '0'; board.appendChild(c); cells.push(c); }

    function spawn() {
      const empties = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) empties.push([r, c]);
      if (!empties.length) return null;
      const [r, c] = empties[Math.floor(Math.random() * empties.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
      return [r, c];
    }
    function draw(popRC) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = grid[r][c], el = cells[r * N + c];
        el.textContent = v || ''; el.dataset.v = v;
      }
      if (popRC) { const el = cells[popRC[0] * N + popRC[1]]; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    }
    // slide one line toward index 0, merging equal neighbours once
    function slide(line) {
      let arr = line.filter((v) => v); let gained = 0;
      for (let i = 0; i < arr.length - 1; i++) if (arr[i] === arr[i + 1]) { arr[i] *= 2; gained += arr[i]; if (arr[i] === 2048) won = true; arr.splice(i + 1, 1); }
      while (arr.length < N) arr.push(0);
      const moved = arr.some((v, i) => v !== line[i]);
      return { arr, gained, moved };
    }
    function move(dir) {
      if (over) return;
      let moved = false, gained = 0;
      for (let i = 0; i < N; i++) {
        let line;
        if (dir === 'left') line = grid[i].slice();
        else if (dir === 'right') line = grid[i].slice().reverse();
        else if (dir === 'up') line = [grid[0][i], grid[1][i], grid[2][i], grid[3][i]];
        else line = [grid[3][i], grid[2][i], grid[1][i], grid[0][i]];
        const res = slide(line); if (res.moved) moved = true; gained += res.gained;
        let out = res.arr; if (dir === 'right' || dir === 'down') out = out.slice().reverse();
        if (dir === 'left' || dir === 'right') grid[i] = out;
        else for (let r = 0; r < N; r++) grid[r][i] = out[r];
      }
      if (!moved) return;
      score += gained; $score.textContent = score + ' pts';
      const sp = spawn(); draw(sp);
      if (won && msg.dataset.win !== '1') { msg.dataset.win = '1'; msg.textContent = '🎉 You hit 2048! Keep going for a high score.'; }
      if (isOver()) { over = true; setTimeout(() => endScreen('twenty48', score), 550); }
    }
    function isOver() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!grid[r][c]) return false;
        if (c < N - 1 && grid[r][c] === grid[r][c + 1]) return false;
        if (r < N - 1 && grid[r][c] === grid[r + 1][c]) return false;
      }
      return true;
    }
    const KEY = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    const onKey = (e) => { const dir = KEY[e.key.toLowerCase()]; if (dir) { e.preventDefault(); move(dir); } };
    document.addEventListener('keydown', onKey); overlay._keyHandler = onKey;
    // touch swipe
    let tx = 0, ty = 0;
    board.addEventListener('touchstart', (e) => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
    board.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0]; const dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    spawn(); spawn(); draw();
  };

  /* ---------- confetti burst ---------- */
  function confetti() {
    const colors = ['#6366F1', '#C026D3', '#06B6D4', '#F59E0B', '#10B981'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = (40 + Math.random() * 20) + '%';
      c.style.background = colors[i % colors.length];
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      $body.appendChild(c);
      const dx = (Math.random() - 0.5) * 320, dy = 260 + Math.random() * 220, rot = Math.random() * 720;
      c.animate(
        [{ transform: c.style.transform, opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg)`, opacity: 0 }],
        { duration: 1200 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.3,1)' }
      ).onfinish = () => c.remove();
    }
  }

  /* ---------- public hook + card wiring ---------- */
  window.Games = { open, best: bestOf, list: GAMES };

  // wire the section cards: click / keyboard → open game; fill "best" labels
  document.querySelectorAll('[data-game]').forEach((card) => {
    const id = card.dataset.game;
    const open2 = () => open(id);
    card.addEventListener('click', open2);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open2(); } });
  });
  document.querySelectorAll('[data-best]').forEach((el) => {
    const b = bestOf(el.dataset.best);
    el.textContent = b ? `${b} ${GAMES[el.dataset.best].unit}` : '—';
  });
})();
