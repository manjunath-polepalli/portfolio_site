/* ==========================================================================
   intro.js — cinematic page-load animation
   --------------------------------------------------------------------------
   Plays a short (~2.4s) branded reveal the first time the page loads in a
   session: animated logo + name + tagline over a moving aurora, a loading
   sweep, then the curtain "irises" open to reveal the site. Skippable
   (click / Esc / Skip button). Honors prefers-reduced-motion (shows nothing
   and just reveals the page). Once per session so the owner isn't spammed on
   reloads — every fresh visitor still gets the wow moment.
   ========================================================================== */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Plays on every load/refresh (only skipped for reduced-motion users).
  if (reduce) { document.documentElement.classList.add('intro-done'); return; }

  // hide page scroll while the intro plays
  document.documentElement.classList.add('intro-playing');

  const overlay = document.createElement('div');
  overlay.className = 'intro';
  overlay.id = 'intro';
  overlay.innerHTML = `
    <div class="intro__aurora" aria-hidden="true"></div>
    <button class="intro__skip" id="introSkip">Skip ›</button>
    <div class="intro__center">
      <div class="intro__logo">
        <svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">
          <defs>
            <linearGradient id="introG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#4F46E5"/><stop offset=".5" stop-color="#8B3CFF"/><stop offset="1" stop-color="#E018E0"/>
            </linearGradient>
          </defs>
          <rect class="intro__logobox" x="14" y="14" width="92" height="92" rx="26" fill="none" stroke="url(#introG)" stroke-width="4"
                stroke-dasharray="360" stroke-dashoffset="360"/>
          <text x="60" y="76" font-family="Space Grotesk, sans-serif" font-size="46" font-weight="700" fill="url(#introG)" text-anchor="middle">PM</text>
        </svg>
      </div>
      <h1 class="intro__name" aria-label="Polepalli Manjunath">
        ${'Polepalli'.split('').map((c, i) => `<span style="animation-delay:${0.5 + i * 0.045}s">${c}</span>`).join('')}
        <span class="intro__sp">&nbsp;</span>
        ${'Manjunath'.split('').map((c, i) => `<span style="animation-delay:${0.5 + (i + 9) * 0.045}s">${c}</span>`).join('')}
      </h1>
      <p class="intro__tag">Azure Engineer · Full-Stack · AI</p>
      <div class="intro__bar"><i></i></div>
    </div>`;
  document.body.appendChild(overlay);

  let done = false;
  function finish() {
    if (done) return; done = true;
    overlay.classList.add('intro--out');               // iris/curtain reveal
    document.documentElement.classList.remove('intro-playing');
    document.documentElement.classList.add('intro-done');
    setTimeout(() => overlay.remove(), 1100);
    // greet via the mascot just after reveal
    setTimeout(() => { if (window.Nova) window.Nova.cheer(); }, 1200);
  }

  overlay.querySelector('#introSkip').addEventListener('click', finish);
  overlay.addEventListener('click', (e) => { if (e.target.id !== 'introSkip') finish(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); }, { once: true });
  // auto-finish after the sequence
  setTimeout(finish, 2600);
})();
