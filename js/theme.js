/* ==========================================================================
   theme.js — light/dark theme toggle
   • Honors a saved choice (localStorage), else the OS preference.
   • Applied to <html data-theme> ASAP to avoid a flash.
   • Updates the hand-rolled charts' colors by re-reading CSS variables
     (charts pull colors from the DOM, so we just nudge a redraw event).
   ========================================================================== */
(() => {
  'use strict';
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  const initial = saved || 'dark';   // dark is the default; a saved choice always wins
  root.setAttribute('data-theme', initial);

  function build() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      btn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      // let charts / mascot know the palette changed
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
      if (window.Pixel) window.Pixel.cheer();
    });
  }
  if (document.readyState !== 'loading') build();
  else document.addEventListener('DOMContentLoaded', build);
})();
