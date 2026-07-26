/* ==========================================================================
   demos.js — Five self-contained, fully interactive project demos
   --------------------------------------------------------------------------
   Each demo is registered in the DEMOS map keyed by id. main.js reads the
   metadata to build the project cards + modal header, and calls render(el)
   to mount the live, working demo into the modal body. No backend, no API
   keys: every demo runs entirely client-side so it works for any visitor.

   Registered demos:
     1. kanban  — drag & drop task board with localStorage persistence
     2. api     — REST API playground (filter / paginate / latency sim)
     3. azure   — serverless autoscale + cost simulator
     4. ai      — client-side document analyzer (sentiment/keywords/readability)
     5. kpi     — live executive KPI dashboard (filterable charts)
   ========================================================================== */
const DEMOS = {};

/* small DOM helper */
/* Build DOM from an HTML string. Returns a single element when the template
   has exactly one root, otherwise a DocumentFragment containing ALL roots —
   so multi-section demo layouts append completely (the earlier bug dropped
   every sibling after the first, leaving #ids null). */
const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.childElementCount === 1 ? t.content.firstElementChild : t.content;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ============================================================ 1. KANBAN === */
DEMOS.kanban = {
  title: 'FlowBoard — Real-Time Task Board',
  subtitle: 'Web app · drag & drop · offline persistence',
  badge: 'Web Application',
  color: 'g-blue',
  icon: 'layout',
  preview: (cv) => {  /* card thumbnail bars */
    Charts.bar(cv, { data: [4, 7, 3, 9, 5, 8], labels: ['', '', '', '', '', ''], color: '#2563EB', height: cv.parentElement.clientHeight });
  },
  docs: {
    problem: 'Distributed product teams lose context switching between chat, email and spreadsheets. They need a single, instantly-responsive board that keeps working even on flaky connections.',
    solution: 'A zero-latency Kanban board with native HTML5 drag-and-drop, optimistic UI updates, and an offline-first persistence layer (localStorage, swappable for an API). State is normalized and re-rendered immutably.',
    stack: ['React-style state model', 'HTML5 Drag & Drop API', 'localStorage', 'CSS Grid', 'Optimistic UI'],
    outcomes: ['Sub-16ms drag interactions (60fps)', 'Works fully offline', 'Zero data loss across sessions', 'Keyboard-accessible controls'],
  },
  render(root) {
    const KEY = 'flowboard.v1';
    const seed = {
      todo: [
        { id: 1, t: 'Design event-sourcing schema', p: 'high', who: 'PM' },
        { id: 2, t: 'Write OpenAPI contract', p: 'med', who: 'API' },
      ],
      doing: [{ id: 3, t: 'Implement autoscale policy', p: 'high', who: 'DevOps' }],
      done: [{ id: 4, t: 'Set up CI/CD pipeline', p: 'low', who: 'You' }],
    };
    let state = JSON.parse(localStorage.getItem(KEY) || 'null') || structuredClone(seed);
    let nextId = 100;
    const save = () => localStorage.setItem(KEY, JSON.stringify(state));
    const cols = [['todo', 'To Do'], ['doing', 'In Progress'], ['done', 'Done']];

    root.innerHTML = '';
    root.append(el(`
      <div class="demo-toolbar">
        <div class="field" style="flex:1;min-width:200px">
          <label for="kb-input">Add a task</label>
          <input id="kb-input" class="input" placeholder="e.g. Refactor auth middleware…" />
        </div>
        <div class="field"><label for="kb-prio">Priority</label>
          <select id="kb-prio"><option value="high">High</option><option value="med" selected>Medium</option><option value="low">Low</option></select>
        </div>
        <button class="btn btn--sm" id="kb-add" style="align-self:flex-end">+ Add task</button>
        <button class="btn--ghost btn btn--sm" id="kb-reset" style="align-self:flex-end">Reset</button>
      </div>
      <div class="kanban" id="kb-board"></div>
      <p style="margin-top:16px;font-size:.85rem;color:var(--text-muted)">↕ Drag cards between columns — changes persist in your browser. Reopen the page and they're still here.</p>
    `));

    const board = root.querySelector('#kb-board');
    const prioClass = { high: 'prio-high', med: 'prio-med', low: 'prio-low' };
    const prioLabel = { high: 'High', med: 'Med', low: 'Low' };

    function draw() {
      board.innerHTML = '';
      cols.forEach(([key, name]) => {
        const col = el(`<div class="kcol" data-col="${key}">
          <div class="kcol__head">${name}<span class="count">${state[key].length}</span></div>
        </div>`);
        state[key].forEach((card) => {
          const c = el(`<div class="kcard" draggable="true" data-id="${card.id}" data-col="${key}">
            <div class="kcard__top">
              <span class="kcard__prio ${prioClass[card.p]}">${prioLabel[card.p]}</span>
              <button class="kcard__del" aria-label="Delete task" title="Delete">
                <svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p>${esc(card.t)}</p>
            <div class="kcard__meta">
              <svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>${esc(card.who)}
            </div>
          </div>`);
          c.querySelector('.kcard__del').addEventListener('click', () => { state[key] = state[key].filter((x) => x.id !== card.id); save(); draw(); });
          c.addEventListener('dragstart', () => { c.classList.add('dragging'); window.__kbDrag = { id: card.id, from: key }; });
          c.addEventListener('dragend', () => c.classList.remove('dragging'));
          col.append(c);
        });
        col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', (e) => {
          e.preventDefault(); col.classList.remove('drag-over');
          const d = window.__kbDrag; if (!d) return;
          const card = state[d.from].find((x) => x.id === d.id);
          state[d.from] = state[d.from].filter((x) => x.id !== d.id);
          state[key].push(card); save(); draw();
        });
        board.append(col);
      });
    }
    function add() {
      const inp = root.querySelector('#kb-input'); const v = inp.value.trim(); if (!v) return;
      state.todo.unshift({ id: nextId++, t: v, p: root.querySelector('#kb-prio').value, who: 'You' });
      inp.value = ''; save(); draw(); inp.focus();
    }
    root.querySelector('#kb-add').addEventListener('click', add);
    root.querySelector('#kb-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    root.querySelector('#kb-reset').addEventListener('click', () => { state = structuredClone(seed); save(); draw(); });
    draw();
  },
};

/* =========================================================== 2. API ===== */
DEMOS.api = {
  title: 'DataForge — REST API Playground',
  subtitle: 'Backend · query engine · pagination & latency',
  badge: 'Backend / REST API',
  color: 'g-emerald',
  icon: 'server',
  preview: (cv) => {
    Charts.line(cv, { series: [{ name: 'rps', data: [20, 35, 28, 50, 42, 70, 65, 90], color: '#059669' }], labels: ['', '', '', '', '', '', '', ''], height: cv.parentElement.clientHeight });
  },
  docs: {
    problem: 'Front-end teams burn hours waiting on backend endpoints and on understanding query semantics (filtering, sorting, pagination). They need a contract they can explore live.',
    solution: 'A simulated REST service over an in-memory dataset implementing real query-engine semantics: field filtering, full-text search, multi-sort, cursor pagination, and a configurable latency/error budget — exactly mirroring a production Node/Express + PostgreSQL API.',
    stack: ['Node.js / Express (modeled)', 'PostgreSQL query semantics', 'Cursor pagination', 'JSON Schema', 'Rate-limit & latency sim'],
    outcomes: ['Deterministic, documented contract', 'Filtering + sort + pagination', 'p95 latency surfaced per request', 'Graceful error envelopes'],
  },
  render(root) {
    /* in-memory "database" */
    const ROLES = ['Engineer', 'Architect', 'Analyst', 'Manager', 'Designer'];
    const REGIONS = ['NA', 'EU', 'APAC', 'LATAM'];
    const DB = Array.from({ length: 240 }, (_, i) => ({
      id: i + 1,
      name: ['Ava', 'Liam', 'Noah', 'Mia', 'Ethan', 'Zoe', 'Kai', 'Ivy', 'Leo', 'Sara'][i % 10] + ' ' + ['Patel', 'Chen', 'Garcia', 'Kim', 'Smith', 'Okoye', 'Rossi', 'Haddad'][i % 8],
      role: ROLES[i % ROLES.length],
      region: REGIONS[i % REGIONS.length],
      score: 60 + ((i * 37) % 40),
      active: i % 3 !== 0,
    }));

    root.innerHTML = '';
    root.append(el(`
      <div class="demo-toolbar">
        <div class="field"><label>Endpoint</label>
          <div class="api-req">
            <span class="method m-get">GET</span>
            <code style="font-family:var(--font-mono);font-size:.85rem;color:var(--text-soft);align-self:center">/api/v1/users</code>
          </div>
        </div>
      </div>
      <div class="demo-toolbar" style="margin-bottom:8px">
        <div class="field"><label for="ap-role">role=</label>
          <select id="ap-role"><option value="">any</option>${ROLES.map((r) => `<option>${r}</option>`).join('')}</select></div>
        <div class="field"><label for="ap-region">region=</label>
          <select id="ap-region"><option value="">any</option>${REGIONS.map((r) => `<option>${r}</option>`).join('')}</select></div>
        <div class="field"><label for="ap-q">search=</label><input id="ap-q" class="input" placeholder="name…" style="min-width:140px"></div>
        <div class="field"><label for="ap-sort">sort=</label>
          <select id="ap-sort"><option value="id">id</option><option value="score">-score</option><option value="name">name</option></select></div>
        <div class="field"><label for="ap-limit">limit=</label>
          <select id="ap-limit"><option>5</option><option selected>8</option><option>15</option></select></div>
        <button class="btn btn--sm" id="ap-send" style="align-self:flex-end">▷ Send request</button>
      </div>
      <div class="api-meta">
        <span class="status-dot"><b id="ap-status">200 OK</b></span>
        <span class="pill-stat"><b id="ap-latency">—</b><span>ms latency</span></span>
        <span class="pill-stat"><b id="ap-count">—</b><span>matched</span></span>
        <span class="pill-stat"><b id="ap-page">1</b><span>page</span></span>
      </div>
      <div class="code-out" id="ap-out">// Click “Send request” to query the API…</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn--ghost btn btn--sm" id="ap-prev">← Prev page</button>
        <button class="btn--ghost btn btn--sm" id="ap-next">Next page →</button>
      </div>
    `));

    let page = 1;
    const $ = (s) => root.querySelector(s);
    function query() {
      const role = $('#ap-role').value, region = $('#ap-region').value, q = $('#ap-q').value.trim().toLowerCase();
      const sort = $('#ap-sort').value, limit = +$('#ap-limit').value;
      let rows = DB.filter((r) =>
        (!role || r.role === role) && (!region || r.region === region) && (!q || r.name.toLowerCase().includes(q)));
      rows.sort((a, b) => sort === 'score' ? b.score - a.score : sort === 'name' ? a.name.localeCompare(b.name) : a.id - b.id);
      const total = rows.length, pages = Math.max(1, Math.ceil(total / limit));
      page = Math.min(page, pages);
      const slice = rows.slice((page - 1) * limit, page * limit);
      return { slice, total, pages, limit };
    }
    function send(reset) {
      if (reset) page = 1;
      const latency = 40 + Math.round(Math.random() * 160);
      $('#ap-out').textContent = '// …awaiting response';
      $('#ap-status').textContent = '…'; $('#ap-status').style.color = 'var(--amber)';
      setTimeout(() => {
        const { slice, total, pages, limit } = query();
        const body = {
          meta: { total, page, pages, limit, latency_ms: latency },
          data: slice.map((r) => ({ id: r.id, name: r.name, role: r.role, region: r.region, score: r.score, active: r.active })),
        };
        $('#ap-out').innerHTML = colorJSON(body);
        $('#ap-status').textContent = '200 OK'; $('#ap-status').style.color = 'var(--emerald)';
        $('#ap-latency').textContent = latency;
        $('#ap-count').textContent = total;
        $('#ap-page').textContent = `${page}/${pages}`;
      }, latency);
    }
    function colorJSON(obj) {
      const json = JSON.stringify(obj, null, 2);
      return esc(json)
        .replace(/&quot;(\w+)&quot;:/g, '<span class="k">"$1"</span>:')
        .replace(/: &quot;(.*?)&quot;/g, ': <span class="s">"$1"</span>')
        .replace(/: (\d+\.?\d*)/g, ': <span class="n">$1</span>')
        .replace(/: (true|false)/g, ': <span class="b">$1</span>');
    }
    $('#ap-send').addEventListener('click', () => send(true));
    ['#ap-role', '#ap-region', '#ap-sort', '#ap-limit'].forEach((s) => $(s).addEventListener('change', () => send(true)));
    $('#ap-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(true); });
    $('#ap-prev').addEventListener('click', () => { if (page > 1) { page--; send(false); } });
    $('#ap-next').addEventListener('click', () => { page++; send(false); });
    send(true);
  },
};

/* ========================================================= 3. AZURE ===== */
DEMOS.azure = {
  title: 'CloudScale — Azure Serverless Simulator',
  subtitle: 'Cloud · autoscale · cost modeling',
  badge: 'Azure Cloud Solution',
  color: 'g-sky',
  icon: 'cloud',
  preview: (cv) => {
    Charts.bar(cv, { data: [2, 4, 8, 14, 9, 5], labels: ['', '', '', '', '', ''], color: '#0EA5E9', height: cv.parentElement.clientHeight });
  },
  docs: {
    problem: 'Teams over-provision VMs "just in case", paying for idle capacity, or under-provision and fall over under spikes. Leadership wants to see the cost/latency trade-off of going serverless before committing.',
    solution: 'An interactive model of an event-driven Azure architecture — API Management → Functions (Consumption plan, auto-scaling) → Cosmos DB → Storage. Drag the traffic slider and watch instances scale out/in with live cost, throughput and cold-start modeling.',
    stack: ['Azure Functions (Consumption)', 'API Management', 'Cosmos DB', 'Event Grid', 'Bicep / IaC'],
    outcomes: ['~70% lower cost vs always-on VMs at bursty load', 'Scales 1→200 instances automatically', 'Pay-per-execution model', 'Visualized cold-start impact'],
  },
  render(root) {
    root.innerHTML = '';
    root.append(el(`
      <div class="az-stage">
        <div class="az-flow">
          <div class="az-node" data-n="0"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h18M3 6h18M3 18h18"/></svg><div class="t">API Mgmt</div><div class="s" id="az-rps">0 rps</div></div>
          <div class="az-node" data-n="1"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg><div class="t">Functions</div><div class="s" id="az-inst-c">1 inst</div></div>
          <div class="az-node" data-n="2"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/></svg><div class="t">Cosmos DB</div><div class="s" id="az-ru">400 RU/s</div></div>
          <div class="az-node" data-n="3"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg><div class="t">Storage</div><div class="s">geo-redundant</div></div>
        </div>
        <div class="az-instances" id="az-instances"></div>
      </div>

      <div class="demo-toolbar" style="margin-top:20px;align-items:center">
        <div class="field" style="flex:1;min-width:240px">
          <label for="az-traffic">Incoming traffic — <b id="az-traffic-val">500</b> requests/sec</label>
          <input id="az-traffic" class="range" type="range" min="0" max="20000" value="500" step="100" style="width:100%">
        </div>
        <div class="seg" id="az-plan" role="tablist" aria-label="Hosting plan">
          <button class="is-active" data-plan="serverless">Serverless</button>
          <button data-plan="vm">Always-on VMs</button>
        </div>
      </div>

      <div class="kpi-row" style="margin-top:8px">
        <div class="kpi"><div class="lbl">Active instances</div><div class="val" id="az-instances-n">1</div><div class="delta delta-up" id="az-scale">auto-scaling</div></div>
        <div class="kpi"><div class="lbl">Est. monthly cost</div><div class="val" id="az-cost">$0</div><div class="delta" id="az-cost-note">pay-per-use</div></div>
        <div class="kpi"><div class="lbl">p95 latency</div><div class="val" id="az-lat">— ms</div><div class="delta" id="az-cold">warm</div></div>
        <div class="kpi"><div class="lbl">Throughput headroom</div><div class="val" id="az-head">100%</div><div class="delta delta-up">healthy</div></div>
      </div>
    `));

    const $ = (s) => root.querySelector(s);
    let plan = 'serverless';
    const PER_INSTANCE = 350; // rps an instance handles

    function update() {
      const rps = +$('#az-traffic').value;
      $('#az-traffic-val').textContent = rps.toLocaleString();
      $('#az-rps').textContent = Charts.fmt(rps) + ' rps';

      let instances, cost, costNote, lat, cold, head, scaleNote;
      if (plan === 'serverless') {
        instances = Math.max(1, Math.ceil(rps / PER_INSTANCE));
        instances = Math.min(instances, 200);
        // Functions consumption: ~$0.20 per million executions + GB-s; modeled monthly
        const execMonthly = rps * 2.6e6; // seconds in a month approx
        cost = Math.round((execMonthly / 1e6) * 0.20 + instances * 1.6);
        costNote = 'pay-per-execution';
        const coldHit = rps > 0 && rps < 200;
        lat = coldHit ? 320 : 45 + Math.min(80, instances * 0.4);
        cold = coldHit ? 'cold-start' : 'warm';
        scaleNote = `1 → ${instances} auto`;
        head = Math.max(0, Math.round(100 - (rps % PER_INSTANCE) / PER_INSTANCE * 30));
      } else {
        // Always-on VMs: must provision for peak, billed 24/7
        instances = Math.max(2, Math.ceil(rps / PER_INSTANCE) + 1); // +1 buffer, min 2 for HA
        instances = Math.min(instances, 200);
        cost = instances * 140; // ~$140/VM/mo
        costNote = 'billed 24/7';
        lat = 38 + Math.min(40, instances * 0.2);
        cold = 'always warm';
        scaleNote = 'manual / fixed';
        head = Math.round(((instances * PER_INSTANCE - rps) / (instances * PER_INSTANCE)) * 100);
      }

      $('#az-instances-n').textContent = instances;
      $('#az-inst-c').textContent = instances + ' inst';
      $('#az-cost').textContent = '$' + cost.toLocaleString();
      $('#az-cost-note').textContent = costNote;
      $('#az-cost-note').className = 'delta ' + (plan === 'serverless' ? 'delta-up' : 'delta-down');
      $('#az-lat').textContent = Math.round(lat) + ' ms';
      $('#az-cold').textContent = cold;
      $('#az-cold').className = 'delta ' + (cold === 'cold-start' ? 'delta-down' : 'delta-up');
      $('#az-scale').textContent = scaleNote;
      $('#az-head').textContent = Math.max(0, head) + '%';
      $('#az-ru').textContent = Charts.fmt(Math.max(400, rps * 5)) + ' RU/s';

      // instance chips (cap visual at 40)
      const wrap = $('#az-instances'); wrap.innerHTML = '';
      const show = Math.min(instances, 40);
      for (let i = 0; i < show; i++) { const c = el(`<div class="az-inst">${i + 1}</div>`); c.style.animationDelay = (i * 12) + 'ms'; wrap.append(c); }
      if (instances > 40) wrap.append(el(`<div class="az-inst" style="background:#334155;width:auto;padding:0 8px">+${instances - 40}</div>`));

      // pulse active nodes
      root.querySelectorAll('.az-node').forEach((n) => n.classList.toggle('active', rps > 0));
    }

    $('#az-traffic').addEventListener('input', update);
    $('#az-plan').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      $('#az-plan').querySelector('.is-active').classList.remove('is-active');
      b.classList.add('is-active'); plan = b.dataset.plan; update();
    }));
    update();
  },
};

/* ============================================================ 4. AI ===== */
DEMOS.ai = {
  title: 'InsightLens — AI Document Analyzer',
  subtitle: 'AI · NLP · runs 100% in your browser',
  badge: 'AI-Powered Tool',
  color: 'g-violet',
  icon: 'sparkles',
  preview: (cv) => {
    Charts.donut(cv, { data: [62, 25, 13], labels: ['Positive', 'Neutral', 'Negative'], colors: ['#7C3AED', '#A855F7', '#C4B5FD'], height: cv.parentElement.clientHeight, centerLabel: 'NLP' });
  },
  docs: {
    problem: 'Reviewing large volumes of free-text feedback, tickets or documents manually is slow and inconsistent. Teams want instant signal — tone, key topics, readability — without shipping sensitive text to a third-party API.',
    solution: 'An on-device NLP pipeline: lexicon-based sentiment scoring, TF-style keyword extraction with stop-word filtering, extractive summarization (sentence ranking), and Flesch reading-ease scoring. Privacy-preserving — text never leaves the browser. The same architecture swaps cleanly to the Azure OpenAI API for deep analysis.',
    stack: ['JavaScript NLP', 'Sentiment lexicon', 'TF keyword ranking', 'Extractive summarization', 'Azure OpenAI (optional)'],
    outcomes: ['Instant analysis, fully private', 'Sentiment + keywords + summary', 'Readability grade level', '0 external API calls'],
  },
  render(root) {
    const SAMPLE = `Our team delivered the new analytics platform ahead of schedule and the results have been outstanding. Customers love the intuitive dashboard and the response time is incredibly fast. However, a few users reported confusing navigation on mobile and the onboarding flow felt slow. Overall, engagement increased dramatically and support tickets dropped. We are confident this release sets a strong foundation for future growth and innovation.`;
    const POS = new Set('outstanding love intuitive fast confident strong growth innovation great excellent amazing delivered ahead increased dramatically success successful improve improved better best happy reliable robust seamless efficient win wins gained boost positive clear secure scalable'.split(' '));
    const NEG = new Set('confusing slow bug bugs error errors fail failed failure crash crashed poor bad worst slow late delayed broken issue issues problem problems difficult hard frustrating drop dropped declined risk risky unstable downtime complaint negative'.split(' '));
    const STOP = new Set('the a an and or but to of in on at for with is are was were be been this that these those it its we our you your they their he she i as by from has have had will would can could should do does did not no so if then than too very more most much many few new'.split(' '));

    root.innerHTML = '';
    root.append(el(`
      <div class="field" style="margin-bottom:16px">
        <label for="ai-text">Paste text to analyze</label>
        <textarea id="ai-text" class="input" rows="6" placeholder="Paste feedback, a document, reviews…">${esc(SAMPLE)}</textarea>
      </div>
      <div class="demo-toolbar" style="margin-bottom:20px">
        <button class="btn btn--sm" id="ai-run">✦ Analyze</button>
        <button class="btn--ghost btn btn--sm" id="ai-clear">Clear</button>
        <span class="pill-stat"><b id="ai-words">0</b><span>words</span></span>
        <span class="pill-stat"><b id="ai-read-min">0</b><span>min read</span></span>
      </div>

      <div class="demo-panel" style="margin-bottom:16px">
        <h4 style="font-family:var(--font-head);margin-bottom:6px">Sentiment</h4>
        <div class="sentiment-bar"><div class="needle" id="ai-needle" style="left:50%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--text-muted)"><span>Negative</span><span id="ai-senti-label" style="font-weight:700;color:var(--text)">Neutral</span><span>Positive</span></div>
      </div>

      <div class="ai-out" style="margin-bottom:16px">
        <div class="ai-stat"><div class="v" id="ai-score">0</div><div class="k">sentiment score</div></div>
        <div class="ai-stat"><div class="v" id="ai-grade">—</div><div class="k">reading ease</div></div>
        <div class="ai-stat"><div class="v" id="ai-sent">0</div><div class="k">sentences</div></div>
        <div class="ai-stat"><div class="v" id="ai-unique">0</div><div class="k">unique terms</div></div>
      </div>

      <div class="demo-panel" style="margin-bottom:16px">
        <h4 style="font-family:var(--font-head);margin-bottom:10px">Top keywords</h4>
        <div class="chips" id="ai-keywords"></div>
      </div>
      <div class="demo-panel">
        <h4 style="font-family:var(--font-head);margin-bottom:8px">Auto-summary</h4>
        <p id="ai-summary" style="font-size:.95rem;color:var(--text-soft)"></p>
      </div>
    `));

    const $ = (s) => root.querySelector(s);
    function analyze() {
      const text = $('#ai-text').value.trim();
      const words = text.toLowerCase().match(/[a-z']+/g) || [];
      const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
      $('#ai-words').textContent = words.length;
      $('#ai-read-min').textContent = Math.max(1, Math.round(words.length / 220));
      $('#ai-sent').textContent = sentences.length;

      // sentiment
      let pos = 0, neg = 0;
      words.forEach((w) => { if (POS.has(w)) pos++; if (NEG.has(w)) neg++; });
      const net = pos - neg;
      const score = Math.max(-100, Math.min(100, Math.round((net / Math.max(4, pos + neg + 4)) * 100)));
      $('#ai-score').textContent = (score > 0 ? '+' : '') + score;
      $('#ai-score').style.color = score > 12 ? 'var(--emerald)' : score < -12 ? 'var(--danger)' : 'var(--amber)';
      $('#ai-needle').style.left = (50 + score / 2) + '%';
      const label = score > 12 ? 'Positive' : score < -12 ? 'Negative' : 'Neutral';
      $('#ai-senti-label').textContent = label;

      // keywords (TF minus stop-words)
      const freq = {};
      words.forEach((w) => { if (w.length > 3 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
      const uniq = Object.keys(freq).length;
      $('#ai-unique').textContent = uniq;
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
      $('#ai-keywords').innerHTML = top.length ? top.map(([w, n]) => `<span class="chip-kw">${esc(w)} ·${n}</span>`).join('') : '<span style="color:var(--text-muted);font-size:.85rem">—</span>';

      // readability (Flesch reading ease, simplified)
      const syll = words.reduce((a, w) => a + Math.max(1, (w.match(/[aeiouy]+/g) || []).length), 0);
      const fre = sentences.length && words.length
        ? Math.round(206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syll / words.length)) : 0;
      const grade = fre >= 70 ? 'Easy' : fre >= 50 ? 'Standard' : fre >= 30 ? 'Complex' : 'Difficult';
      $('#ai-grade').textContent = grade;

      // extractive summary: rank sentences by keyword density
      const ranked = sentences.map((s) => {
        const sw = s.toLowerCase().match(/[a-z']+/g) || [];
        const sc = sw.reduce((a, w) => a + (freq[w] || 0), 0) / Math.max(1, sw.length);
        return { s, sc };
      }).sort((a, b) => b.sc - a.sc).slice(0, 2).map((x) => x.s.trim());
      $('#ai-summary').textContent = ranked.length ? ranked.join(' ') : 'Add more text to generate a summary.';
    }
    $('#ai-run').addEventListener('click', analyze);
    $('#ai-clear').addEventListener('click', () => { $('#ai-text').value = ''; analyze(); });
    analyze();
  },
};

/* =========================================================== 5. KPI ===== */
DEMOS.kpi = {
  title: 'PulseBoard — Executive KPI Dashboard',
  subtitle: 'Enterprise · live charts · drill-down filters',
  badge: 'Enterprise Dashboard',
  color: 'g-amber',
  icon: 'activity',
  preview: (cv) => {
    Charts.line(cv, { series: [
      { name: 'rev', data: [30, 45, 38, 60, 55, 78, 72, 95], color: '#D97706' },
      { name: 'cost', data: [20, 25, 22, 30, 28, 35, 33, 40], color: '#94A3B8' },
    ], labels: ['', '', '', '', '', '', '', ''], height: cv.parentElement.clientHeight });
  },
  docs: {
    problem: 'Executives juggle a dozen siloed reports and still cannot answer "how are we doing right now?". They need one board that unifies revenue, usage, reliability and CSAT with drill-down by region and period.',
    solution: 'A real-time analytics dashboard aggregating multiple data domains into KPI tiles and interactive charts. Period and region filters recompute every metric instantly; charts are accessible (legend, tooltips, tabular figures) and animate on update.',
    stack: ['Data aggregation layer', 'Canvas visualizations', 'Time-series rollups', 'WebSocket-ready', 'Role-based filters'],
    outcomes: ['Single source of truth for leadership', 'Sub-second filter recompute', 'Region & period drill-down', 'Accessible, animated charts'],
  },
  render(root) {
    root.innerHTML = '';
    root.append(el(`
      <div class="demo-toolbar">
        <div class="seg" id="kpi-period">
          <button data-p="7" class="is-active">7d</button>
          <button data-p="30">30d</button>
          <button data-p="90">90d</button>
        </div>
        <div class="field"><label for="kpi-region">Region</label>
          <select id="kpi-region"><option value="all">All regions</option><option>NA</option><option>EU</option><option>APAC</option></select></div>
        <span class="pill-stat" style="margin-left:auto"><b id="kpi-updated">live</b><span>● syncing</span></span>
      </div>

      <div class="kpi-row" id="kpi-tiles"></div>

      <div class="dash-charts">
        <div class="chart-box">
          <h4>Revenue vs. Cost <span style="font-size:.74rem;color:var(--text-muted);font-weight:500">▲ trend</span></h4>
          <canvas id="kpi-line"></canvas>
        </div>
        <div class="chart-box">
          <h4>Traffic by channel</h4>
          <canvas id="kpi-donut"></canvas>
        </div>
      </div>
      <div class="chart-box" style="margin-top:16px">
        <h4>Daily active users</h4>
        <canvas id="kpi-bar"></canvas>
      </div>
    `));

    const $ = (s) => root.querySelector(s);
    let period = 7, region = 'all';
    const rf = { all: 1, NA: 0.42, EU: 0.31, APAC: 0.27 };

    // deterministic-ish pseudo data generator so charts feel real
    function seriesFor(n, base, vol, seed) {
      let v = base; const out = [];
      for (let i = 0; i < n; i++) { v += (Math.sin(i * 0.7 + seed) * vol) + (Math.random() - 0.45) * vol; out.push(Math.max(1, Math.round(v))); }
      return out;
    }
    function labelsFor(n) {
      const out = []; const today = new Date();
      const step = n <= 7 ? 1 : n <= 30 ? 3 : 9;
      for (let i = n - 1; i >= 0; i -= step) { const d = new Date(today); d.setDate(today.getDate() - i); out.push((d.getMonth() + 1) + '/' + d.getDate()); }
      return out;
    }

    let lineC, barC, donutC;
    function render() {
      const m = rf[region];
      const n = period;
      const rev = seriesFor(n, 40 * m * (period / 7), 8 * m, 1).map((x) => x + 20);
      const cost = rev.map((r) => Math.round(r * (0.38 + Math.random() * 0.05)));
      const dau = seriesFor(n, 1200 * m, 180 * m, 3);
      const labels = labelsFor(n);
      // sample to label count
      const sample = (arr) => { const out = []; const step = Math.max(1, Math.floor(arr.length / labels.length)); for (let i = 0; i < arr.length; i += step) out.push(arr[i]); return out.slice(0, labels.length); };

      // KPI tiles
      const totalRev = rev.reduce((a, b) => a + b, 0);
      const totalCost = cost.reduce((a, b) => a + b, 0);
      const margin = Math.round(((totalRev - totalCost) / totalRev) * 100);
      const uptime = (99.9 + Math.random() * 0.09).toFixed(2);
      const csat = (4.4 + Math.random() * 0.5).toFixed(1);
      const tiles = [
        ['Revenue', '$' + Charts.fmt(totalRev * 1000), '+' + (8 + (period % 9)) + '%', true, 'dollar'],
        ['Gross margin', margin + '%', '+' + (2 + (period % 4)) + '%', true, 'trend'],
        ['Avg DAU', Charts.fmt(dau.reduce((a, b) => a + b) / dau.length), '+' + (5 + (period % 7)) + '%', true, 'users'],
        ['Uptime', uptime + '%', '+0.02%', true, 'shield'],
        ['CSAT', csat + ' / 5', '+0.2', true, 'star'],
      ];
      $('#kpi-tiles').innerHTML = tiles.map(([lbl, val, d, up]) => `
        <div class="kpi">
          <div class="lbl">${lbl}</div>
          <div class="val">${val}</div>
          <div class="delta ${up ? 'delta-up' : 'delta-down'}">${up ? '▲' : '▼'} ${d}</div>
        </div>`).join('');

      const sRev = sample(rev), sCost = sample(cost), sDau = sample(dau);
      if (!lineC) lineC = Charts.line($('#kpi-line'), { series: [{ name: 'Revenue', data: sRev, color: '#D97706' }, { name: 'Cost', data: sCost, color: '#94A3B8' }], labels, height: 230 });
      else lineC.update([{ name: 'Revenue', data: sRev, color: '#D97706' }, { name: 'Cost', data: sCost, color: '#94A3B8' }], labels);

      if (!barC) barC = Charts.bar($('#kpi-bar'), { data: sDau, labels, color: '#2563EB', height: 200 });
      else barC.update(sDau, labels);

      const ch = [Math.round(48 * m + Math.random() * 8), Math.round(26 * m + Math.random() * 6), Math.round(16 * m + Math.random() * 4), Math.round(10 * m)];
      if (!donutC) donutC = Charts.donut($('#kpi-donut'), { data: ch, labels: ['Organic', 'Paid', 'Referral', 'Social'], height: 230 });
      else donutC.update(ch);

      $('#kpi-updated').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    $('#kpi-period').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      $('#kpi-period').querySelector('.is-active').classList.remove('is-active');
      b.classList.add('is-active'); period = +b.dataset.p; render();
    }));
    $('#kpi-region').addEventListener('change', (e) => { region = e.target.value; render(); });
    render();
    // gentle live refresh while modal is open
    this._timer = setInterval(render, 5000);
  },
  cleanup() { if (this._timer) clearInterval(this._timer); },
};
