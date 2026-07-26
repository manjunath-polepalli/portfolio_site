/* ==========================================================================
   motion.js — page-wide "liveliness": progress bar, parallax, scroll cue
   --------------------------------------------------------------------------
   • Top scroll-progress bar (gradient) so the page feels responsive.
   • Aurora parallax: the colored blobs drift with mouse + scroll, so the
     background subtly reacts to you (depth + curiosity).
   • Hero "scroll to explore" cue that invites the first scroll, then fades.
   • Tilt-on-pointer for the hero code card (premium micro-interaction).
   All transform/opacity only; fully disabled under prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);

  /* ---- scroll progress bar ---- */
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  const fill = bar.firstElementChild;
  const updateBar = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  if (reduce) return;  // everything below is decorative motion

  /* ---- aurora parallax (mouse + scroll) ---- */
  const aurora = $('.aurora');
  let mx = 0, my = 0, sy = 0, raf = 0;
  function applyParallax() {
    raf = 0;
    if (aurora) aurora.style.transform = `translate(${mx * 22}px, ${my * 22 + sy * 0.06}px)`;
    const visual = $('.hero__visual');
    if (visual) visual.style.transform = `translateY(${sy * -0.04}px)`;
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(applyParallax); };
  window.addEventListener('mousemove', (e) => { mx = (e.clientX / window.innerWidth - 0.5); my = (e.clientY / window.innerHeight - 0.5); schedule(); }, { passive: true });
  window.addEventListener('scroll', () => { sy = window.scrollY; schedule(); }, { passive: true });

  /* ---- hero tilt on the code card ---- */
  const card = $('.code-card');
  const visualWrap = $('.hero__visual');
  if (card && visualWrap) {
    visualWrap.addEventListener('mousemove', (e) => {
      const r = visualWrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg)`;
    });
    visualWrap.addEventListener('mouseleave', () => { card.style.transform = ''; });
  }

  /* ---- hero portrait: artistic background drifts with the cursor ---- */
  const portrait = $('#portrait');
  if (portrait) {
    const shapes = portrait.querySelectorAll('.portrait__art .pa');
    let praf = 0, ppx = 0, ppy = 0;
    const applyPortrait = () => {
      praf = 0;
      shapes.forEach((s) => { const d = +s.dataset.depth || 0; s.style.transform = `translate(${(ppx * d).toFixed(1)}px, ${(ppy * d).toFixed(1)}px)`; });
    };
    portrait.addEventListener('mousemove', (e) => {
      const r = portrait.getBoundingClientRect();
      ppx = (e.clientX - r.left) / r.width - 0.5;
      ppy = (e.clientY - r.top) / r.height - 0.5;
      if (!praf) praf = requestAnimationFrame(applyPortrait);
    }, { passive: true });
    portrait.addEventListener('mouseleave', () => { shapes.forEach((s) => { s.style.transform = ''; }); });

    /* flourish when the theme is switched (theme.js dispatches 'themechange') */
    window.addEventListener('themechange', () => {
      portrait.classList.remove('theme-flip');
      void portrait.offsetWidth;            // restart the animation
      portrait.classList.add('theme-flip');
      setTimeout(() => portrait.classList.remove('theme-flip'), 800);
    });
  }

  /* ---- "scroll to explore" cue in the hero ---- */
  const hero = $('.hero .hero__inner');
  if (hero) {
    const cue = document.createElement('button');
    cue.className = 'scroll-cue';
    cue.setAttribute('aria-label', 'Scroll to explore');
    cue.innerHTML = `<span>Scroll to explore</span>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>`;
    document.querySelector('.hero').appendChild(cue);
    cue.addEventListener('click', () => { const t = document.querySelector('#snapshot') || document.querySelector('#expertise'); t && t.scrollIntoView({ behavior: 'smooth' }); });
    const onScrollCue = () => { cue.classList.toggle('hide', window.scrollY > 60); };
    window.addEventListener('scroll', onScrollCue, { passive: true });
  }
})();
