/* ==========================================================================
   live.js — Live data cards + AI chat
   --------------------------------------------------------------------------
   Three cards fetch REAL data from public, key-free, CORS-enabled APIs:
     • Weather  — Open-Meteo            (no key)
     • Markets  — CoinGecko             (no key)
     • Trending — GitHub Search API     (no key; 60 req/h unauthenticated)
   Each shows a shimmer skeleton while loading, friendly error + retry on
   failure, refreshes itself on an interval, and supports interaction
   (filter / expand). Fetching is LAZY — it only starts when the section
   scrolls into view (IntersectionObserver), per the perf requirements.

   The AI chat is a client-side assistant (keyword intent matching) so it
   works with zero backend. To upgrade it to a real LLM, see the
   `askLLM()` stub + README "Live data deployment".
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* tiny fetch helper with timeout + JSON */
  async function getJSON(url, opts = {}) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, ...opts });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(to); }
  }
  const skeleton = (rows = 4) => `<div class="skel skel-block"></div>` + Array.from({ length: rows }, (_, i) =>
    `<div class="skel skel-line ${i % 2 ? 'w60' : 'w80'}"></div>`).join('');
  const errorBox = (id) => `
    <div class="lerror">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      <p>Couldn't reach the live service.<br><small>It may be rate-limited or offline.</small></p>
      <button class="btn btn--ghost btn--sm" data-retry="${id}">↻ Retry</button>
    </div>`;
  const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  /* =============================== WEATHER ============================== */
  const WX = {
    // WMO weather codes → label + emoji
    map(code) {
      const t = (em, lbl) => ({ em, lbl });
      if (code === 0) return t('☀️', 'Clear sky');
      if (code <= 2) return t('🌤️', 'Mostly clear');
      if (code === 3) return t('☁️', 'Overcast');
      if (code <= 48) return t('🌫️', 'Fog');
      if (code <= 57) return t('🌦️', 'Drizzle');
      if (code <= 67) return t('🌧️', 'Rain');
      if (code <= 77) return t('❄️', 'Snow');
      if (code <= 82) return t('🌧️', 'Rain showers');
      if (code <= 86) return t('🌨️', 'Snow showers');
      return t('⛈️', 'Thunderstorm');
    },
    async load(body, foot) {
      body.innerHTML = skeleton(2);
      try {
        // Lowell, MA
        const d = await getJSON('https://api.open-meteo.com/v1/forecast?latitude=42.6334&longitude=-71.3162&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph');
        const c = d.current; const w = WX.map(c.weather_code);
        body.innerHTML = `
          <div class="wx-now stagger-in">
            <span class="wx-ico" aria-hidden="true">${w.em}</span>
            <div><div class="wx-temp">${Math.round(c.temperature_2m)}°</div><div style="color:var(--text-muted);font-size:.9rem">${w.lbl} · Lowell, MA</div></div>
          </div>
          <div class="wx-meta stagger-in" style="animation-delay:.08s">
            <div>Feels like<b>${Math.round(c.apparent_temperature)}°F</b></div>
            <div>Humidity<b>${c.relative_humidity_2m}%</b></div>
            <div>Wind<b>${Math.round(c.wind_speed_10m)} mph</b></div>
            <div>Code<b>WMO ${c.weather_code}</b></div>
          </div>`;
        foot.querySelector('.t').textContent = 'Updated ' + stamp();
      } catch (e) { body.innerHTML = errorBox('weather'); }
    },
  };

  /* =============================== MARKETS ============================= */
  const MK = {
    async load(body, foot) {
      body.innerHTML = skeleton(5);
      try {
        const d = await getJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=6&page=1&price_change_percentage=24h');
        body.innerHTML = d.map((c, i) => {
          const ch = c.price_change_percentage_24h || 0;
          const up = ch >= 0;
          return `<div class="lrow stagger-in" style="animation-delay:${i * 50}ms">
            <img src="${c.image}" alt="" width="22" height="22" loading="lazy" style="border-radius:50%">
            <div class="lr-main"><div class="lr-title">${c.name}</div><div class="lr-sub">${c.symbol.toUpperCase()}</div></div>
            <div style="text-align:right">
              <div class="lr-title">$${c.current_price.toLocaleString()}</div>
              <div class="lr-stat ${up ? 'lr-up' : 'lr-down'}">${up ? '▲' : '▼'} ${Math.abs(ch).toFixed(2)}%</div>
            </div>
          </div>`;
        }).join('');
        foot.querySelector('.t').textContent = 'Updated ' + stamp();
      } catch (e) { body.innerHTML = errorBox('markets'); }
    },
  };

  /* ============================== TRENDING ============================ */
  const GH = {
    lang: '',
    LANG_COLOR: { JavaScript: '#F1E05A', Python: '#3572A5', TypeScript: '#3178C6', Go: '#00ADD8', Rust: '#DEA584', '': '#94A3B8' },
    async load(body, foot) {
      body.innerHTML = `
        <div class="live-filter" id="ghFilter">
          ${['', 'JavaScript', 'Python', 'TypeScript', 'Go'].map((l) =>
            `<button class="${l === GH.lang ? 'on' : ''}" data-lang="${l}">${l || 'All'}</button>`).join('')}
        </div>${skeleton(4)}`;
      body.querySelectorAll('#ghFilter button').forEach((b) => b.addEventListener('click', () => { GH.lang = b.dataset.lang; GH.load(body, foot); }));
      try {
        const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
        const q = encodeURIComponent(`created:>${since}${GH.lang ? ' language:' + GH.lang : ''}`);
        const d = await getJSON(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=5`);
        const rows = (d.items || []).map((r, i) => `
          <a class="lrow stagger-in" href="${r.html_url}" target="_blank" rel="noopener" style="animation-delay:${i * 50}ms;text-decoration:none">
            <span class="lang-dot" style="background:${GH.LANG_COLOR[r.language] || '#94A3B8'}"></span>
            <div class="lr-main"><div class="lr-title">${r.full_name}</div><div class="lr-sub">${(r.description || 'No description').slice(0, 60)}</div></div>
            <span class="lr-stat">★ ${(r.stargazers_count / 1000).toFixed(1)}k</span>
          </a>`).join('');
        body.querySelector('#ghFilter').insertAdjacentHTML('afterend', `<div>${rows || '<p style="color:var(--text-muted)">No results.</p>'}</div>`);
        // remove the skeleton that followed the filter
        const skels = body.querySelectorAll('.skel'); skels.forEach((s) => s.remove());
        foot.querySelector('.t').textContent = 'Updated ' + stamp();
      } catch (e) {
        body.querySelectorAll('.skel').forEach((s) => s.remove());
        body.querySelector('#ghFilter').insertAdjacentHTML('afterend', errorBox('trending'));
      }
    },
  };

  /* ====================== card factory + lazy init ==================== */
  const CARDS = {
    weather: { icon: 'cloud', cls: 'g-sky', title: 'Live Weather', sub: 'Open-Meteo', mod: WX, every: 600000 },
    markets: { icon: 'trend', cls: 'g-amber', title: 'Crypto Markets', sub: 'CoinGecko', mod: MK, every: 60000 },
    trending: { icon: 'git', cls: 'g-violet', title: 'Trending Repos', sub: 'GitHub', mod: GH, every: 300000 },
  };
  const grid = $('#liveGrid');
  if (grid) {
    Object.entries(CARDS).forEach(([id, cfg]) => {
      const card = document.createElement('article');
      card.className = 'lcard'; card.dataset.id = id;
      card.innerHTML = `
        <div class="lcard__head">
          <span class="ic-wrap ${cfg.cls}" data-icon="${cfg.icon}"></span>
          <h3>${cfg.title}</h3>
          <span class="live-dot"><i></i> live</span>
        </div>
        <div class="lcard__body" aria-live="polite"></div>
        <div class="lcard__foot"><span class="t">via ${cfg.sub}</span><button data-refresh="${id}">↻ Refresh</button></div>`;
      grid.appendChild(card);
      // render the icon (main.js icon pass already ran, so do it here too)
      if (window.PortfolioIcons) card.querySelector('[data-icon]').innerHTML = window.PortfolioIcons(cfg.icon);
    });

    let started = false;
    const lazy = new IntersectionObserver((entries) => {
      if (started || !entries.some((e) => e.isIntersecting)) return;
      started = true; lazy.disconnect();
      Object.entries(CARDS).forEach(([id, cfg]) => {
        const card = grid.querySelector(`[data-id="${id}"]`);
        const body = card.querySelector('.lcard__body'), foot = card.querySelector('.lcard__foot');
        const run = () => cfg.mod.load(body, foot);
        run();
        if (cfg.every) setInterval(run, cfg.every);
        card.querySelector('[data-refresh]').addEventListener('click', run);
      });
    }, { rootMargin: '120px' });
    lazy.observe(grid);

    // delegated retry buttons (data-retry value matches the card id)
    grid.addEventListener('click', (e) => {
      const r = e.target.closest('[data-retry]'); if (!r) return;
      const id = r.dataset.retry; const cfg = CARDS[id]; if (!cfg) return;
      const card = grid.querySelector(`[data-id="${id}"]`);
      cfg.mod.load(card.querySelector('.lcard__body'), card.querySelector('.lcard__foot'));
    });
  }

  /* ============================== AI CHAT ============================= */
  /* A genuinely responsive client-side assistant. It tokenizes the question,
     expands synonyms, scores every intent by weighted keyword/phrase
     overlap, and picks the best match — returning varied answers (so it
     never feels like a fixed reply). Falls back gracefully by reflecting
     what it understood. Exposed as window.Assistant so the mascot reuses it.
     To use a REAL LLM instead, point askLLM() at your proxy (see README). */
  const Assistant = (() => {
    // synonym groups → canonical token (helps short/varied phrasing match)
    const SYN = {
      azure: ['azure', 'cloud', 'serverless', 'functions', 'cosmos', 'devops', 'infra', 'infrastructure'],
      job: ['job', 'work', 'role', 'experience', 'career', 'employment', 'history', 'worked', 'position'],
      current: ['current', 'now', 'currently', 'present', 'today', 'tmobile', 't-mobile', 'tmobil'],
      skill: ['skill', 'skills', 'tech', 'stack', 'technology', 'technologies', 'language', 'languages', 'tools', 'know', 'good'],
      project: ['project', 'projects', 'demo', 'demos', 'portfolio', 'build', 'built', 'made', 'work samples'],
      ai: ['ai', 'ml', 'machine', 'learning', 'nlp', 'openai', 'llm', 'gpt', 'model', 'data'],
      edu: ['education', 'degree', 'university', 'college', 'study', 'studied', 'masters', 'master', 'school', 'rivier', 'graduate', 'graduated'],
      contact: ['contact', 'email', 'reach', 'phone', 'call', 'message', 'connect', 'linkedin'],
      hire: ['hire', 'hiring', 'recruit', 'recruiter', 'available', 'availability', 'open', 'opportunity', 'opportunities', 'why'],
      game: ['game', 'games', 'play', 'fun', 'arcade'],
      who: ['who', 'about', 'yourself', 'manjunath', 'polepalli', 'name', 'introduce', 'bio'],
      location: ['location', 'where', 'based', 'live', 'lives', 'lowell', 'relocate', 'remote', 'onsite'],
      strength: ['strength', 'strengths', 'best', 'great', 'good at', 'standout', 'unique', 'bring', 'value'],
      resume: ['resume', 'cv', 'download'],
    };
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    const tokensOf = (s) => {
      const words = norm(s).split(' ');
      const out = new Set(words);
      // map synonyms to canonical tokens
      for (const [canon, list] of Object.entries(SYN)) if (list.some((w) => norm(s).includes(w))) out.add('@' + canon);
      return out;
    };
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // intents: triggers (canonical @tokens / words) → varied answers
    const INTENTS = [
      { id: 'greet', triggers: ['hi', 'hello', 'hey', 'yo', 'hiya', 'greetings', 'sup'], a: [
        "Hey! 👋 I'm Nova, Manjunath's portfolio assistant. Ask me about his Azure & cloud work, skills, the live demos, or how to hire him.",
        "Hi there! 😄 Want the quick tour? Try “What are his strengths?”, “Tell me about his Azure experience”, or “How do I contact him?”." ] },
      { id: 'howareyou', triggers: ['how are you', 'how r u', "how's it going", 'whats up', "what's up"], a: [
        "Running at 60fps and happy to help! 🤖 What would you like to know about Manjunath?" ] },
      { id: 'who', triggers: ['@who'], a: [
        "Polepalli Manjunath is a software engineer specializing in full-stack development, Microsoft Azure, and AI-enabled apps. He's currently an Azure Engineer at T-Mobile, with a Master's in CS from Rivier University.",
        "Manjunath is an Azure Engineer (currently at T-Mobile) and full-stack developer. He builds cloud-native web apps with React, Python/Node and Azure, and recently completed his M.S. in Computer Science." ] },
      { id: 'current', triggers: ['@current'], a: [
        "Right now he's an **Azure Engineer at T-Mobile** (since June 2026), building and operating cloud solutions at telecom scale. Before that he was an Azure Engineer at Rivier University (~1.5 yrs) during his master's." ] },
      { id: 'azure', triggers: ['@azure'], a: [
        "On Azure he works with Functions (serverless), Cosmos DB, storage, CI/CD and cost-aware autoscaling — he's AZ-900 certified (in progress). Try the **CloudScale** demo in the Work section: drag the traffic slider and watch it autoscale and price itself. ☁️",
        "Azure is his focus: serverless Functions, managed data (Cosmos DB), infrastructure and CI/CD. The interactive **CloudScale** demo shows serverless vs. always-on cost trade-offs — give it a spin!" ] },
      { id: 'skill', triggers: ['@skill'], a: [
        "Core stack: **Python, JavaScript, React, Node.js, PostgreSQL** and **REST APIs**, plus **Azure** (Functions, Cosmos DB) and AI tooling (**Pandas, NumPy, OpenAI API**). The Expertise section breaks each pillar down.",
        "He's strongest in full-stack web (React + Python/Node + PostgreSQL), Azure cloud services, and applied AI/data. Scroll to **Expertise** for the full toolbox." ] },
      { id: 'job', triggers: ['@job'], a: [
        "Experience, newest first: **Azure Engineer @ T-Mobile** (2026–present) → **Azure Engineer @ Rivier University** (~1.5 yrs, during his M.S.) → **Software Developer @ SWOT** (2022–2024) → **Web Developer Intern @ Ventro** (2021–2022). The About section has the timeline." ] },
      { id: 'project', triggers: ['@project'], a: [
        "There are **5 live, working demos**: a drag-&-drop Kanban board, a REST API playground, an Azure autoscale simulator, an AI document analyzer, and an executive KPI dashboard. Hit any **“Launch demo”** in the Work section! 🚀",
        "Check the Work section — 5 interactive demos you can actually use: FlowBoard (Kanban), DataForge (API), CloudScale (Azure), InsightLens (AI), and PulseBoard (dashboard)." ] },
      { id: 'ai', triggers: ['@ai'], a: [
        "His AI work is practical: NLP pipelines, data tooling with Pandas/NumPy, and LLM integration via the OpenAI / Azure OpenAI APIs. The **InsightLens** demo runs sentiment, keyword and readability analysis entirely in your browser — try it!",
        "He builds applied AI — text analysis, data processing and LLM-powered features. Open the **InsightLens** demo to see on-device NLP in action." ] },
      { id: 'edu', triggers: ['@edu'], a: [
        "**M.S. in Computer Science — Rivier University** (2024–2026, completed). He also worked as an Azure Engineer at Rivier during the program, plus certifications: AZ-900 (in progress), Full-Stack Web (KodNest), Java & Python (Coursera)." ] },
      { id: 'contact', triggers: ['@contact'], a: [
        "📨 **venkat01121968@gmail.com** · 📞 **+1 978-818-4622** · 🔗 linkedin.com/in/polepalli-manjunath. There's a contact form at the bottom too — replies within 24h!" ] },
      { id: 'hire', triggers: ['@hire'], a: [
        "He's an Azure Engineer at T-Mobile and **open to connect** about cloud / full-stack / AI engineering roles. Why him: real Azure production experience, full-stack range, and a Master's in CS — and this whole site is hand-built proof. Use the Contact form to reach out! 🤝",
        "Recruiting? He brings hands-on Azure cloud engineering, full-stack delivery, and applied AI — backed by measurable results (e.g., 78% faster reporting at SWOT). Hit **Hire me** / the Contact section." ] },
      { id: 'strength', triggers: ['@strength'], a: [
        "Three standouts: **(1)** real Azure cloud engineering in production (T-Mobile), **(2)** genuine full-stack range — frontend craft to REST APIs and data, **(3)** applied AI/automation that ships measurable results. This site itself — hand-coded, zero frameworks — is a live work sample." ] },
      { id: 'location', triggers: ['@location'], a: [
        "He's based in **Lowell, MA** and currently works at T-Mobile as an Azure Engineer. For role-specific logistics (remote/relocation), reach out via the Contact form." ] },
      { id: 'game', triggers: ['@game'], a: [
        "Take a break in the **Games** section 🎮 — Reaction Rush, Memory Match and Quick Math, each ~30s with saved leaderboards and Bronze/Silver/Gold badges. Beat the gold!" ] },
      { id: 'resume', triggers: ['@resume'], a: [
        "His full experience, certifications and impact are on this page (Impact + About). For a PDF résumé, use the **Contact** form or email and he'll send it over. 📄" ] },
      { id: 'thanks', triggers: ['thanks', 'thank', 'thx', 'cool', 'awesome', 'nice', 'great', 'amazing'], a: [
        "You're welcome! 😄 Explore the demos and games — and drag Nova (that's me!) around the page for fun.",
        "Anytime! 🙌 If you're hiring, the Contact section is the fastest way to reach him." ] },
      { id: 'bye', triggers: ['bye', 'goodbye', 'see you', 'later', 'cya'], a: [
        "Thanks for stopping by! 👋 Don't forget the Contact form if you'd like to connect." ] },
      { id: 'joke', triggers: ['joke', 'funny', 'laugh'], a: [
        "Why did the developer go broke? Because he used up all his cache. 💸 …Now, ask me about Manjunath's Azure work!" ] },
    ];

    function ask(text) {
      if (!text || !text.trim()) return "Ask me about Manjunath's skills, Azure experience, projects, education, or how to get in touch!";
      const toks = tokensOf(text);
      const raw = norm(text);
      let best = null, score = 0;
      for (const intent of INTENTS) {
        let s = 0;
        for (const trig of intent.triggers) {
          if (trig.startsWith('@')) { if (toks.has(trig)) s += 3; }
          else if (trig.includes(' ')) { if (raw.includes(trig)) s += 3; }
          else if (toks.has(trig)) s += 2;
        }
        if (s > score) { score = s; best = intent; }
      }
      if (best && score > 0) return pick(best.a);
      // graceful fallback that reflects understanding
      return `Good question! I'm a portfolio assistant, so I'm best on Manjunath himself. I can tell you about his **Azure / cloud experience**, **skills**, the **5 live demos**, his **education**, **why he's a strong hire**, or **how to contact him**. Which would you like? 👇`;
    }
    return { ask, version: 'rule-based-v2' };
  })();
  window.Assistant = Assistant;

  /* Real-LLM upgrade point: replace the body with a call to your proxy.
     Returns a Promise<string> so the chat UI stays the same. (See README.) */
  async function askLLM(text) {
    // const r = await getJSON('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: text }) });
    // return r.reply;
    return Assistant.ask(text);
  }

  const chatMount = $('#aiChat');
  if (chatMount) {
    chatMount.innerHTML = `
      <div class="chat">
        <div class="chat__log" id="chatLog" aria-live="polite"></div>
        <div class="chat__sugg" id="chatSugg">
          ${['What are his skills?', 'Tell me about Azure', 'Show me projects', 'How do I contact him?'].map((s) => `<button>${s}</button>`).join('')}
        </div>
        <form class="chat__in" id="chatForm">
          <input class="input" id="chatInput" placeholder="Ask me anything…" aria-label="Message the assistant" autocomplete="off">
          <button class="btn" type="submit" aria-label="Send">
            <svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>`;
    const log = $('#chatLog', chatMount);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fmtBold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');  // render **bold** safely
    const add = (cls, html) => { const m = document.createElement('div'); m.className = `msg ${cls}`; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; };
    async function send(text) {
      add('user', esc(text));                       // escape user input (no XSS)
      const typing = add('bot typing', '<i></i><i></i><i></i>');
      const reply = await askLLM(text);
      await new Promise((r) => setTimeout(r, reduce ? 0 : 550));
      typing.remove();
      add('bot', fmtBold(reply));
    }
    add('bot', "Hi! 🤖 I'm the portfolio assistant. Ask about Manjunath's skills, Azure experience, or projects — or tap a suggestion.");
    $('#chatForm', chatMount).addEventListener('submit', (e) => { e.preventDefault(); const v = $('#chatInput').value.trim(); if (!v) return; $('#chatInput').value = ''; send(v); });
    $('#chatSugg', chatMount).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => send(b.textContent)));
  }
})();
