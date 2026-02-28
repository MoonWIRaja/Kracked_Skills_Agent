#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

function toPort(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

function readEvents(eventsPath, maxHistory = 1200) {
  if (!fs.existsSync(eventsPath)) return [];
  const lines = fs.readFileSync(eventsPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event && typeof event === 'object') parsed.push(event);
    } catch {
      // Skip malformed line.
    }
  }
  return parsed.slice(-maxHistory);
}

function buildState(events) {
  const byAgent = new Map();

  for (const event of events) {
    const id = String(event.agent_id || event.agent_name || 'unknown');
    if (!byAgent.has(id)) {
      byAgent.set(id, {
        id,
        name: String(event.agent_name || id),
        role: String(event.role || '-'),
        actions: {},
        total: 0,
        last_ts: null,
        source: String(event.source || '-'),
      });
    }

    const agent = byAgent.get(id);
    agent.name = String(event.agent_name || agent.name);
    agent.role = String(event.role || agent.role);
    agent.source = String(event.source || agent.source);
    agent.total += 1;
    agent.last_ts = event.ts || agent.last_ts;
    const action = String(event.action || 'unknown');
    agent.actions[action] = (agent.actions[action] || 0) + 1;
  }

  const agents = [...byAgent.values()].sort((a, b) => {
    if (a.id === 'main-agent' && b.id !== 'main-agent') return -1;
    if (b.id === 'main-agent' && a.id !== 'main-agent') return 1;
    return b.total - a.total;
  });

  const recent = events.slice(-80).reverse();
  return {
    total_events: events.length,
    agents,
    recent,
    updated_at: new Date().toISOString(),
  };
}

function contentType(url) {
  if (url.endsWith('.css')) return 'text/css; charset=utf-8';
  if (url.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (url.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/html; charset=utf-8';
}

function html() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KD Pixel Web Observer</title>
  <style>
    :root {
      --bg: #030806;
      --panel: #08140f;
      --panel-2: #0b1b15;
      --line: #1cff8a;
      --line-dim: #0f7040;
      --txt: #d8ffe9;
      --muted: #7cb59a;
      --warn: #ffd76b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Consolas", "JetBrains Mono", monospace;
      color: var(--txt);
      background:
        radial-gradient(circle at 20% 10%, #103423 0%, transparent 35%),
        radial-gradient(circle at 80% 0%, #173a2b 0%, transparent 25%),
        linear-gradient(180deg, #010503 0%, var(--bg) 50%, #010503 100%);
      min-height: 100vh;
    }
    .grid {
      background-image:
        linear-gradient(rgba(28,255,138,.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(28,255,138,.08) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .shell {
      max-width: 1280px;
      margin: 18px auto;
      padding: 0 14px;
    }
    .header {
      border: 1px solid var(--line-dim);
      background: linear-gradient(180deg, #0b2018 0%, #08140f 100%);
      padding: 14px 16px;
      box-shadow: inset 0 0 24px rgba(28,255,138,.06), 0 0 16px rgba(7,50,30,.45);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }
    .brand {
      font-weight: 700;
      letter-spacing: .08em;
      color: #adffd0;
    }
    .kpi {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pill {
      border: 1px solid var(--line-dim);
      background: #06120d;
      color: var(--muted);
      padding: 5px 8px;
      font-size: 12px;
    }
    .layout {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 12px;
    }
    .panel {
      border: 1px solid var(--line-dim);
      background: linear-gradient(180deg, var(--panel) 0%, var(--panel-2) 100%);
      box-shadow: inset 0 0 20px rgba(28,255,138,.03);
      min-height: 220px;
    }
    .title {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line-dim);
      color: #9af7bf;
      font-weight: 700;
      letter-spacing: .05em;
      font-size: 12px;
      text-transform: uppercase;
    }
    .agent-list, .events {
      max-height: calc(100vh - 220px);
      overflow: auto;
    }
    .agent {
      border-bottom: 1px solid #123325;
      padding: 10px 12px;
      display: grid;
      gap: 4px;
    }
    .agent .name {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-weight: 700;
    }
    .agent .meta {
      color: var(--muted);
      font-size: 12px;
      display: flex;
      justify-content: space-between;
    }
    .chip {
      color: var(--warn);
      border: 1px solid #7a6520;
      background: #2e2509;
      padding: 2px 6px;
      font-size: 11px;
    }
    .event {
      border-bottom: 1px solid #123325;
      padding: 9px 12px;
      display: grid;
      grid-template-columns: 88px 160px 120px 150px 1fr;
      gap: 8px;
      font-size: 12px;
      align-items: center;
    }
    .time { color: #7ee7a9; }
    .muted { color: var(--muted); }
    .empty {
      padding: 14px;
      color: var(--muted);
    }
    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .event { grid-template-columns: 80px 1fr; }
      .event .hide-mobile { display: none; }
    }
  </style>
</head>
<body class="grid">
  <div class="shell">
    <div class="header panel">
      <div>
        <div class="brand">KD PIXEL OBSERVER // WEB MIRROR</div>
        <div class="muted" style="font-size:12px;margin-top:3px;">Antigravity-friendly live panel (event stream mirror)</div>
      </div>
      <div class="kpi">
        <div class="pill" id="kTotal">events: 0</div>
        <div class="pill" id="kAgents">agents: 0</div>
        <div class="pill" id="kUpdated">updated: -</div>
      </div>
    </div>

    <div class="layout">
      <section class="panel">
        <div class="title">Agents Online</div>
        <div class="agent-list" id="agentList"></div>
      </section>
      <section class="panel">
        <div class="title">Recent Events</div>
        <div class="events" id="events"></div>
      </section>
    </div>
  </div>

  <script>
    function fmtTime(ts) {
      if (!ts) return '-';
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toISOString().slice(11, 19);
    }

    async function fetchState() {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed to fetch state');
      return res.json();
    }

    function renderAgents(agents) {
      const root = document.getElementById('agentList');
      if (!agents || agents.length === 0) {
        root.innerHTML = '<div class="empty">Waiting for agent events...</div>';
        return;
      }

      root.innerHTML = agents.map((agent) => {
        const topAction = Object.entries(agent.actions || {}).sort((a,b) => b[1]-a[1])[0];
        const actionLabel = topAction ? topAction[0] : '-';
        return '<article class="agent">' +
          '<div class="name"><span>' + (agent.name || '-') + '</span><span class="chip">' + (agent.total || 0) + ' evt</span></div>' +
          '<div class="meta"><span>' + (agent.role || '-') + '</span><span>' + (agent.source || '-') + '</span></div>' +
          '<div class="meta"><span>top: ' + actionLabel + '</span><span>' + fmtTime(agent.last_ts) + '</span></div>' +
        '</article>';
      }).join('');
    }

    function renderEvents(events) {
      const root = document.getElementById('events');
      if (!events || events.length === 0) {
        root.innerHTML = '<div class="empty">No events yet.</div>';
        return;
      }

      root.innerHTML = events.map((event) => {
        return '<div class="event">' +
          '<div class="time">' + fmtTime(event.ts) + '</div>' +
          '<div>' + (event.agent_name || event.agent_id || '-') + '</div>' +
          '<div class="hide-mobile muted">' + (event.action || '-') + '</div>' +
          '<div class="hide-mobile muted">' + (event.task || '-') + '</div>' +
          '<div class="muted">' + (event.message || '-') + '</div>' +
        '</div>';
      }).join('');
    }

    function renderSummary(state) {
      document.getElementById('kTotal').textContent = 'events: ' + (state.total_events || 0);
      document.getElementById('kAgents').textContent = 'agents: ' + ((state.agents || []).length);
      document.getElementById('kUpdated').textContent = 'updated: ' + fmtTime(state.updated_at);
    }

    async function tick() {
      try {
        const state = await fetchState();
        renderSummary(state);
        renderAgents(state.agents || []);
        renderEvents(state.recent || []);
      } catch (err) {
        console.error(err);
      }
    }

    tick();
    setInterval(tick, 1000);
  </script>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = toPort(args.port, 4892);

  const runtimeDir = fs.existsSync(path.join(process.cwd(), '.kracked', 'runtime'))
    ? path.join(process.cwd(), '.kracked', 'runtime')
    : __dirname;
  const eventsPath = path.join(runtimeDir, 'events.jsonl');
  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, '', 'utf8');

  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    if (url === '/api/state') {
      const state = buildState(readEvents(eventsPath));
      res.writeHead(200, { 'Content-Type': contentType('.json'), 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(state));
      return;
    }

    if (url === '/api/health') {
      res.writeHead(200, { 'Content-Type': contentType('.json') });
      res.end(JSON.stringify({ ok: true, service: 'kd-pixel-web', ts: new Date().toISOString() }));
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType('.html') });
    res.end(html());
  });

  server.listen(port, () => {
    process.stdout.write(`[KD] Pixel web observer running at http://localhost:${port}\n`);
    process.stdout.write('[KD] Press Ctrl+C to stop.\n');
  });
}

main();
