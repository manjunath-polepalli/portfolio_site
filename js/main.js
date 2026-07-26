/* ==========================================================================
   main.js — Page orchestration
   - sticky nav state + mobile menu + active-section highlighting
   - scroll-reveal (IntersectionObserver) & animated stat counters
   - project card rendering (from DEMOS) + accessible modal w/ tabs
   - contact form validation + toast feedback
   - impact-section charts + back-to-top
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------- inline icon set --- */
  /* Lucide-style 24x24 stroke icons, referenced by name across the app. */
  const ICONS = {
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/>',
    server: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4.5 4.5 0 0 0 6.5 19z"/>',
    sparkles: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    api: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    brain: '<path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-3 3 3 3 0 0 0 1 5 3 3 0 0 0 5 1 3 3 0 0 0 5-1 3 3 0 0 0 1-5 3 3 0 0 0-3-3 3 3 0 0 0-3-3z"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2 2 0 0 0-3 0z"/><path d="M12 15l-3-3a22 22 0 0 1 8-10c2 0 4 2 4 4a22 22 0 0 1-10 8z"/><path d="M9 12H4s.5-2.7 2-4c1.3-1 4 0 4 0"/>',
    dollar: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    git: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="9" r="3"/><path d="M18 12a9 9 0 0 1-9 9M6 9v6"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    star: '<path d="M12 2 15 9l7 .5-5.5 4.5L18 21l-6-3.5L6 21l1.5-7L2 9.5 9 9z"/>',
  };
  function svg(name, cls = 'ic', size = 24) {
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  }
  // expose for inline use in index.html via data-icon
  $$('[data-icon]').forEach((n) => { n.innerHTML = svg(n.dataset.icon, 'ic', n.dataset.size || 24); });
  // expose the icon factory so modules loaded later (live.js) can render icons too
  window.PortfolioIcons = (name, size = 24) => svg(name, 'ic', size);

  /* ----------------------------------------------------------- navbar ---- */
  const nav = $('#nav');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
    $('#toTop').classList.toggle('show', window.scrollY > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // mobile menu
  const panel = $('#navPanel'), toggle = $('#navToggle');
  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('#navPanel a').forEach((a) => a.addEventListener('click', () => panel.classList.remove('is-open')));

  // active section highlight
  const navLinks = $$('.nav__links a');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle('active-link', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));

  /* --------------------------------------------------- scroll reveal ----- */
  const revealOb = new IntersectionObserver((entries, ob) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); ob.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$('[data-reveal]').forEach((n) => revealOb.observe(n));

  /* --------------------------------------------------- count-up stats ---- */
  function countUp(node) {
    const target = parseFloat(node.dataset.count);
    const decimals = (node.dataset.count.split('.')[1] || '').length;
    const dur = 1400; let start;
    if (reduceMotion) { node.firstChild ? (node.childNodes[0].nodeValue = format(target)) : (node.textContent = format(target)); return; }
    const prefix = node.dataset.prefix || '', suffix = node.dataset.suffix || '';
    function format(v) { return prefix + v.toFixed(decimals) + suffix; }
    function step(ts) {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = format(target * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const countOb = new IntersectionObserver((entries, ob) => {
    entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); ob.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((n) => countOb.observe(n));

  /* ---- expertise proficiency rings (animate stroke + count on view) ---- */
  const RING_C = 2 * Math.PI * 52;   // circumference for r=52
  const ringOb = new IntersectionObserver((entries, ob) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const card = e.target, pct = +card.dataset.pct || 0;
      const prog = card.querySelector('.ring-prog');
      if (prog) prog.style.strokeDashoffset = (RING_C * (1 - pct / 100)).toFixed(1);
      const pctEl = card.querySelector('.xcard__pct');
      if (pctEl && pctEl.firstChild) {
        if (reduceMotion) { pctEl.firstChild.nodeValue = pct; }
        else {
          const start = performance.now(), dur = 1400;
          const tick = (t) => { const k = Math.min(1, (t - start) / dur); pctEl.firstChild.nodeValue = Math.round((1 - Math.pow(1 - k, 3)) * pct); if (k < 1) requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        }
      }
      ob.unobserve(card);
    });
  }, { threshold: 0.4 });
  $$('.xcard[data-pct]').forEach((c) => ringOb.observe(c));

  /* ------------------------------------------------ render project cards -- */
  const order = ['kanban', 'api', 'azure', 'ai', 'kpi'];
  const grid = $('#projGrid');
  order.forEach((id, i) => {
    const d = DEMOS[id];
    const card = document.createElement('article');
    card.className = 'proj';
    card.setAttribute('data-reveal', '');
    card.dataset.delay = (i % 3) + 1;
    card.innerHTML = `
      <div class="proj__media ${d.color}">
        <span class="proj__badge">${d.badge}</span>
        <canvas class="proj__thumb"></canvas>
      </div>
      <div class="proj__body">
        <h3>${d.title.split(' — ')[0]}</h3>
        <p>${d.docs.problem.slice(0, 118)}…</p>
        <div class="proj__stack">${d.docs.stack.slice(0, 4).map((s) => `<span class="tag">${s}</span>`).join('')}</div>
        <div class="proj__metrics">
          ${d.docs.outcomes.slice(0, 2).map((o) => {
            const m = o.match(/([\d.~+%<k]+)/i);
            return `<div class="proj__metric"><div class="v">${m ? m[0] : '✓'}</div><div class="k">${o.replace(m ? m[0] : '', '').trim().slice(0, 22)}</div></div>`;
          }).join('')}
        </div>
        <div class="proj__foot">
          <button class="btn btn--sm" data-demo="${id}">${svg('rocket', 'ic', 18)} Launch demo</button>
          <button class="btn--ghost btn btn--sm" data-docs="${id}">Read more</button>
        </div>
      </div>`;
    grid.append(card);
    revealOb.observe(card);
    // direct bindings (in addition to delegation) so clicks are never missed
    card.querySelector('[data-demo]').addEventListener('click', (e) => { e.preventDefault(); openDemo(id, 'demo'); });
    card.querySelector('[data-docs]').addEventListener('click', (e) => { e.preventDefault(); openDemo(id, 'docs'); });
    // draw thumbnail once visible
    const thumb = card.querySelector('.proj__thumb');
    const tOb = new IntersectionObserver((en, ob) => {
      en.forEach((e) => { if (e.isIntersecting) { d.preview(thumb); ob.disconnect(); } });
    }, { threshold: 0.3 });
    tOb.observe(thumb);
  });

  /* ------------------------------------------------------------ modal ---- */
  const modal = $('#modal'), mDialog = $('#modalDialog');
  let activeDemo = null, lastFocus = null;

  function openDemo(id, startTab = 'demo') {
    const d = DEMOS[id];
    if (!d) { console.error('[demo] unknown id:', id); return; }
    activeDemo = d;
    lastFocus = document.activeElement;
    $('#modalIcon').className = 'ic-wrap ' + d.color;
    $('#modalIcon').innerHTML = svg(d.icon, 'ic', 22);
    $('#modalTitle').textContent = d.title;
    $('#modalSub').textContent = d.subtitle;

    // tabs
    $$('.modal__tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === startTab));
    const demoPane = $('#paneDemo'); demoPane.innerHTML = '';
    // docs pane
    $('#paneDocs').innerHTML = `
      <div class="doc-grid">
        <div class="doc-card"><h4>Problem</h4><p>${d.docs.problem}</p></div>
        <div class="doc-card"><h4>Solution</h4><p>${d.docs.solution}</p></div>
        <div class="doc-card"><h4>Tech stack</h4><ul>${d.docs.stack.map((s) => `<li>${s}</li>`).join('')}</ul></div>
        <div class="doc-card"><h4>Outcomes &amp; impact</h4><ul>${d.docs.outcomes.map((s) => `<li>${s}</li>`).join('')}</ul></div>
      </div>`;
    setPane(startTab);

    // SHOW the modal FIRST, then render the live demo — so even if a demo's
    // render throws, the modal still opens (and we surface a friendly error).
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('#modalClose').focus();
    try {
      d.render(demoPane);
    } catch (err) {
      console.error('[demo] render failed:', id, err);
      demoPane.innerHTML = `<div class="lerror" style="min-height:200px">
        <p>⚠️ This demo hit a snag rendering in your browser.<br><small>${(err && err.message) || err}</small></p>
        <button class="btn btn--sm" id="demoRetry">↻ Retry</button></div>`;
      const r = demoPane.querySelector('#demoRetry'); if (r) r.addEventListener('click', () => { try { demoPane.innerHTML = ''; d.render(demoPane); } catch (e2) {} });
    }
  }
  function setPane(tab) {
    $('#paneDemo').classList.toggle('is-active', tab === 'demo');
    $('#paneDocs').classList.toggle('is-active', tab === 'docs');
  }
  function closeDemo() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (activeDemo && activeDemo.cleanup) activeDemo.cleanup();
    activeDemo = null;
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', (e) => {
    const demoBtn = e.target.closest('[data-demo]');
    const docsBtn = e.target.closest('[data-docs]');
    if (demoBtn) openDemo(demoBtn.dataset.demo, 'demo');
    if (docsBtn) openDemo(docsBtn.dataset.docs, 'docs');
  });
  $$('.modal__tab').forEach((t) => t.addEventListener('click', () => {
    $$('.modal__tab').forEach((x) => x.classList.remove('is-active'));
    t.classList.add('is-active'); setPane(t.dataset.tab);
  }));
  $('#modalClose').addEventListener('click', closeDemo);
  $('#modalScrim').addEventListener('click', closeDemo);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeDemo(); });
  // simple focus trap
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('button, a, input, select, textarea, [tabindex]', mDialog).filter((n) => !n.disabled && n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* --------------------------------------------------- impact charts ----- */
  const impactObserver = new IntersectionObserver((entries, ob) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      Charts.bar($('#impactBar'), {
        data: [78, 60, 45, 92], labels: ['Report time', 'Manual entry', 'Defects', 'Throughput'],
        color: ['#2563EB', '#7C3AED', '#059669', '#D97706'], horizontal: true, height: 200,
      });
      Charts.line($('#impactLine'), {
        series: [{ name: 'Skill depth', data: [20, 35, 48, 60, 72, 85, 92], color: '#2563EB' }],
        labels: ['2021', '2022', '2023', '2024', '2025', '2026', 'now'], height: 200,
      });
      ob.disconnect();
    });
  }, { threshold: 0.3 });
  if ($('#impactBar')) impactObserver.observe($('#impactBar'));

  /* ------------------------------------------------------ contact form --- */
  const form = $('#contactForm');
  const toast = $('#toast');
  function showToast(msg) {
    toast.querySelector('span').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }
  function validateField(field) {
    const input = $('input, textarea', field);
    let ok = input.value.trim().length > 0;
    if (ok && input.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    field.classList.toggle('invalid', !ok);
    return ok;
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = $$('.field', form);
    let valid = true, firstBad = null;
    fields.forEach((f) => { const ok = validateField(f); if (!ok && !firstBad) firstBad = f; valid = valid && ok; });
    if (!valid) { firstBad && $('input, textarea', firstBad).focus(); return; }
    const btn = $('button[type="submit"]', form);
    btn.disabled = true; btn.textContent = 'Sending…';
    setTimeout(() => {  // simulated async submit
      btn.disabled = false; btn.innerHTML = svg('check', 'ic', 18) + ' Sent';
      $('#formStatus').textContent = 'Thanks! Your message has been queued. I\'ll reply within 24 hours.';
      showToast('Message sent successfully');
      form.reset();
      setTimeout(() => { btn.innerHTML = 'Send message'; }, 2600);
    }, 900);
  });
  // validate on blur (not keystroke) per UX guidelines
  $$('.field input, .field textarea', form).forEach((inp) => {
    inp.addEventListener('blur', () => validateField(inp.closest('.field')));
    inp.addEventListener('input', () => inp.closest('.field').classList.remove('invalid'));
  });

  /* ---------------------------------------------------- back to top + yr - */
  $('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  $('#year').textContent = new Date().getFullYear();
})();
