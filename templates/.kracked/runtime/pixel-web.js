#!/usr/bin/env node

let fs;
let path;
let http;

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

const ROLE_TITLES = {
  analyst: 'Analyst',
  pm: 'Product Manager',
  architect: 'Architect',
  'tech-lead': 'Tech Lead',
  engineer: 'Engineer',
  qa: 'QA',
  security: 'Security',
  devops: 'DevOps',
  'release-manager': 'Release Manager',
};

const TASK_DELEGATION_MAP = {
  'kd-analyze': ['analyst'],
  'kd-brainstorm': ['analyst', 'pm'],
  'kd-prd': ['pm'],
  'kd-arch': ['architect', 'security'],
  'kd-story': ['tech-lead'],
  'kd-dev-story': ['engineer'],
  'kd-code-review': ['qa', 'security'],
  'kd-deploy': ['devops'],
  'kd-release': ['release-manager'],
  'kd-api-design': ['architect'],
  'kd-db-schema': ['architect'],
  'kd-test': ['qa'],
  'kd-security-audit': ['security'],
  'kd-refactor': ['tech-lead', 'engineer'],
  'kd-sprint-planning': ['pm', 'tech-lead'],
  'kd-sprint-review': ['pm', 'qa'],
  'kd-validate': ['qa'],
};

const ROLE_HINTS = {
  analyst: ['analyst', 'analysis', 'discover', 'research', 'stakeholder'],
  pm: ['pm', 'product manager', 'prd', 'roadmap', 'backlog'],
  architect: ['architect', 'architecture', 'system design', 'api design', 'db schema'],
  'tech-lead': ['tech lead', 'tl', 'lead', 'story breakdown', 'refactor'],
  engineer: ['engineer', 'developer', 'dev story', 'implement', 'coding', 'code'],
  qa: ['qa', 'quality', 'testing', 'test'],
  security: ['security', 'audit', 'owasp', 'vulnerability'],
  devops: ['devops', 'deploy', 'deployment', 'ci/cd', 'pipeline'],
  'release-manager': ['release manager', 'release', 'changelog'],
};

function roleToAgentId(role) {
  return `${role}-agent`;
}

function eventTime(event) {
  const ts = new Date(event && event.ts ? event.ts : 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function isMainEvent(event) {
  const id = String((event && event.agent_id) || '').toLowerCase();
  const role = String((event && event.role) || '').toLowerCase();
  return id === 'main-agent' || role.includes('master') || role.includes('main');
}

function normalizeTask(taskRaw) {
  const raw = String(taskRaw || '').trim().toLowerCase();
  if (!raw) return '';
  let token = raw.split(/\s+/)[0];
  token = token.replace(/^\/+/, '');
  token = token.replace(/\.md$/, '');
  token = token.replace(/^kd_/, 'kd-');
  return token;
}

function taskCandidates(taskRaw) {
  const raw = String(taskRaw || '').trim().toLowerCase();
  if (!raw) return [];

  const compact = raw
    .replace(/\.md/g, ' ')
    .replace(/[(){}[\],]/g, ' ')
    .trim();

  const tokens = compact
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/^\/+/, '').replace(/^kd_/, 'kd-'));

  const out = [];
  const first = normalizeTask(raw);
  if (first) out.push(first);
  for (const token of tokens) {
    if (!out.includes(token)) out.push(token);
  }
  return out;
}

function rolesForTask(taskRaw) {
  const candidates = taskCandidates(taskRaw);
  if (candidates.length === 0) return [];

  const roles = new Set();
  for (const task of candidates) {
    if (TASK_DELEGATION_MAP[task]) {
      for (const role of TASK_DELEGATION_MAP[task]) roles.add(role);
      continue;
    }

    if (task.startsWith('kd-role-')) {
      const role = task.slice('kd-role-'.length);
      if (ROLE_TITLES[role]) roles.add(role);
      continue;
    }

    for (const [key, mappedRoles] of Object.entries(TASK_DELEGATION_MAP)) {
      if (task.includes(key)) {
        for (const role of mappedRoles) roles.add(role);
      }
    }
  }

  return [...roles];
}

function rolesFromText(textRaw) {
  const text = String(textRaw || '').trim().toLowerCase();
  if (!text) return [];

  const roles = new Set();
  for (const [role, hints] of Object.entries(ROLE_HINTS)) {
    if (hints.some((hint) => text.includes(hint))) {
      roles.add(role);
    }
  }
  return [...roles];
}

function rolesFromTarget(targetRaw, roster) {
  const target = String(targetRaw || '').trim().toLowerCase();
  if (!target) return [];

  const roles = new Set();
  const segments = target
    .split(/[,\n;|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (segments.length === 0) segments.push(target);

  for (const segment of segments) {
    for (const role of Object.keys(ROLE_TITLES)) {
      if (segment === role || segment === `${role}-agent`) roles.add(role);
    }

    for (const [role, name] of Object.entries((roster && roster.byRole) || {})) {
      if (String(name || '').trim().toLowerCase() === segment) roles.add(role);
    }

    for (const role of rolesFromText(segment)) {
      if (ROLE_TITLES[role]) roles.add(role);
    }
  }

  return [...roles];
}

function inferDelegatedAction(mainActionRaw, role) {
  const mainAction = String(mainActionRaw || '').toLowerCase();
  if (mainAction.includes('wait') || mainAction.includes('idle')) return 'waiting';
  if (role === 'engineer') return 'typing';
  if (role === 'qa' || role === 'security' || role === 'analyst' || role === 'architect') return 'reading';
  if (role === 'devops') return 'running';
  return 'working';
}

function hasRecentActivityForRole(events, role, rosterName, sinceTs) {
  const id = roleToAgentId(role);
  const since = Number.isFinite(sinceTs) ? sinceTs : 0;
  const rosterLower = String(rosterName || '').trim().toLowerCase();

  return events.some((event) => {
    const t = eventTime(event);
    if (t < since) return false;

    const eventId = String((event && event.agent_id) || '').trim().toLowerCase();
    const eventName = String((event && event.agent_name) || '').trim().toLowerCase();
    const eventRole = String((event && event.role) || '').trim().toLowerCase();

    if (eventId === id) return true;
    if (rosterLower && eventName === rosterLower) return true;
    if (eventRole.includes(role.replace('-', ' ')) || eventRole.includes(role)) return true;
    return false;
  });
}

function loadAgentRoster(runtimeDir) {
  const defaults = {
    byRole: {
      analyst: 'Analyst',
      pm: 'PM',
      architect: 'Architect',
      'tech-lead': 'Tech Lead',
      engineer: 'Engineer',
      qa: 'QA',
      security: 'Security',
      devops: 'DevOps',
      'release-manager': 'Release Manager',
    },
  };

  const rosterPath = path.join(path.dirname(runtimeDir), 'config', 'agents.json');
  if (!fs.existsSync(rosterPath)) return defaults;

  try {
    const parsed = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
    const byRole = { ...defaults.byRole };
    if (parsed && parsed.byRole && typeof parsed.byRole === 'object') {
      for (const [role, name] of Object.entries(parsed.byRole)) {
        if (typeof name === 'string' && name.trim()) {
          byRole[role] = name.trim();
        }
      }
    }
    return { byRole };
  } catch {
    return defaults;
  }
}

function synthesizeDelegationEvents(events, roster) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const synthetic = [];
  const latestMain = [...events]
    .filter((event) => isMainEvent(event))
    .sort((a, b) => eventTime(b) - eventTime(a))[0];

  if (latestMain) {
    const roleSet = new Set([
      ...rolesForTask(latestMain.task),
      ...rolesFromText(latestMain.message),
      ...rolesFromText(latestMain.action),
    ]);
    let roles = [...roleSet];
    if (roles.length === 0) {
      const signal = `${String(latestMain.action || '')} ${String(latestMain.message || '')}`.toLowerCase();
      if (/(delegat|consult|ask|help|assist)/.test(signal)) {
        roles = ['analyst'];
      }
    }
    const mainTs = eventTime(latestMain);

    for (const role of roles) {
      const name = (roster && roster.byRole && roster.byRole[role]) || ROLE_TITLES[role] || 'Professional Agent';
      if (hasRecentActivityForRole(events, role, name, mainTs)) continue;

      synthetic.push({
        ts: latestMain.ts || new Date().toISOString(),
        agent_id: roleToAgentId(role),
        agent_name: name,
        role: ROLE_TITLES[role] || 'Professional Agent',
        action: inferDelegatedAction(latestMain.action, role),
        source: latestMain.source || 'kd',
        task: latestMain.task || '',
        message: `${name} handling delegated task`,
      });
    }
  }

  const targetLatestByRole = new Map();
  for (const event of events) {
    if (!event || !event.target_agent_id) continue;
    const roles = rolesFromTarget(event.target_agent_id, roster);
    if (roles.length === 0) continue;

    for (const role of roles) {
      const current = targetLatestByRole.get(role);
      if (!current || eventTime(event) >= eventTime(current)) {
        targetLatestByRole.set(role, event);
      }
    }
  }

  for (const [role, parentEvent] of targetLatestByRole.entries()) {
    const name = (roster && roster.byRole && roster.byRole[role]) || ROLE_TITLES[role] || 'Professional Agent';
    if (hasRecentActivityForRole(events, role, name, eventTime(parentEvent))) continue;

    synthetic.push({
      ts: parentEvent.ts || new Date().toISOString(),
      agent_id: roleToAgentId(role),
      agent_name: name,
      role: ROLE_TITLES[role] || 'Professional Agent',
      action: inferDelegatedAction(parentEvent.action, role),
      source: parentEvent.source || 'kd',
      task: parentEvent.task || '',
      message: `${name} responding to main-agent delegation`,
    });
  }

  if (synthetic.length === 0) return events;
  return [...events, ...synthetic];
}

function buildState(events, roster) {
  const stream = synthesizeDelegationEvents(events, roster);
  const byAgent = new Map();

  for (const event of stream) {
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

  const recent = stream.slice(-80).reverse();
  return {
    total_events: stream.length,
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

async function main() {
  fs = await import('node:fs');
  path = await import('node:path');
  http = await import('node:http');

  const args = parseArgs(process.argv.slice(2));
  const port = toPort(args.port, 4892);

  const cwdRuntime = path.join(process.cwd(), '.kracked', 'runtime');
  const scriptDir = path.dirname(process.argv[1] || process.cwd());
  const runtimeDir = fs.existsSync(cwdRuntime) ? cwdRuntime : scriptDir;
  const eventsPath = path.join(runtimeDir, 'events.jsonl');
  const roster = loadAgentRoster(runtimeDir);
  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, '', 'utf8');

  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    if (url === '/api/state') {
      const state = buildState(readEvents(eventsPath), roster);
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

main().catch((err) => {
  process.stderr.write(`[KD] pixel-web error: ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
});
