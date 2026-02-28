const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const MAX_EVENTS = 260;
const VIEW_ID = 'kdPixel.panelView';
let provider = null;

function activate(context) {
  provider = new KDPanelViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
    vscode.commands.registerCommand('kdPixel.openPanel', () => {
      vscode.commands.executeCommand(`${VIEW_ID}.focus`);
    }),
    vscode.commands.registerCommand('kdPixel.refreshPanel', () => provider.refresh())
  );

  const autoOpen = vscode.workspace.getConfiguration('kdPixel').get('autoOpen', true);
  if (autoOpen && provider.isKDWorkspace()) {
    vscode.commands.executeCommand(`${VIEW_ID}.focus`);
  }
}

function deactivate() {
  if (provider) provider.dispose();
}

class KDPanelViewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
    this.interval = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    this.view.webview.options = { enableScripts: true };
    this.view.webview.html = this.getHtml();

    this.view.onDidDispose(() => {
      this.stopPolling();
      this.view = null;
    });

    this.view.webview.onDidReceiveMessage((message) => {
      if (message && message.type === 'refresh') {
        this.refresh();
      }
    });

    this.startPolling();
    this.refresh();
  }

  refresh() {
    if (!this.view) return;

    const root = this.getWorkspaceRoot();
    const eventsPath = this.getEventsPath(root);
    const events = readEvents(eventsPath);
    const state = buildState(events);

    this.view.webview.postMessage({
      type: 'state',
      payload: {
        root,
        eventsPath,
        ...state,
      },
    });
  }

  startPolling() {
    this.stopPolling();
    const intervalMs = vscode.workspace.getConfiguration('kdPixel').get('refreshIntervalMs', 1500);
    this.interval = setInterval(() => this.refresh(), Math.max(500, Number(intervalMs) || 1500));
  }

  stopPolling() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  dispose() {
    this.stopPolling();
  }

  isKDWorkspace() {
    const root = this.getWorkspaceRoot();
    if (!root) return false;
    return fs.existsSync(path.join(root, '.kracked', 'runtime', 'events.jsonl'));
  }

  getWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return null;
    return folders[0].uri.fsPath;
  }

  getEventsPath(root) {
    const configured = vscode.workspace
      .getConfiguration('kdPixel')
      .get('eventsPath', '.kracked/runtime/events.jsonl');
    if (!configured) return root ? path.join(root, '.kracked', 'runtime', 'events.jsonl') : null;
    if (path.isAbsolute(configured)) return configured;
    return root ? path.join(root, configured) : configured;
  }

  getHtml() {
    return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      --bg: #090f0b;
      --panel: #101a13;
      --line: #2a4533;
      --line-soft: #1a2b21;
      --txt: #d3f5dd;
      --muted: #7ea98a;
      --ok: #89ffb2;
      --warn: #ffd67a;
      --danger: #ff9090;
      --chip: #133022;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Consolas", "JetBrains Mono", monospace;
      color: var(--txt);
      background:
        linear-gradient(rgba(71, 121, 84, .1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(71, 121, 84, .08) 1px, transparent 1px),
        var(--bg);
      background-size: 24px 24px, 24px 24px, auto;
    }
    .wrap {
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 8px;
      min-height: 100vh;
      padding: 8px;
    }
    .head {
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #102116, #0d1812);
      border-radius: 8px;
      padding: 8px 10px;
      display: grid;
      gap: 5px;
    }
    .brand {
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--ok);
      font-weight: 700;
    }
    .meta {
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    button {
      border: 1px solid var(--line);
      background: #133022;
      color: var(--txt);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
    }
    .pill {
      border: 1px solid var(--line);
      background: #0f1e16;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 10px;
      color: var(--muted);
    }
    .stage {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: linear-gradient(180deg, #0d1711, #09100c);
      position: relative;
      min-height: 340px;
      overflow: hidden;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      image-rendering: pixelated;
    }
    .legend {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #0e1913;
      padding: 7px 9px;
      font-size: 10px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .legend strong { color: var(--ok); }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="head">
      <div class="brand">KD PIXEL OBSERVER // Office Mode</div>
      <div class="meta" id="meta">Waiting for KD workspace...</div>
      <div class="toolbar">
        <button id="refreshBtn">Refresh</button>
        <span class="pill" id="kAgents">agents: 0</span>
        <span class="pill" id="kEvents">events: 0</span>
        <span class="pill" id="kUpdated">updated: -</span>
      </div>
    </header>

    <main class="stage">
      <canvas id="office"></canvas>
    </main>

    <footer class="legend">
      <span><strong>walking</strong>: moving to zone/desk</span>
      <span><strong>typing</strong>: seated at desk</span>
      <span><strong>reading</strong>: moves to reading zone</span>
      <span><strong>waiting</strong>: bubble indicator</span>
    </footer>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const canvas = document.getElementById('office');
    const ctx = canvas.getContext('2d');
    const metaEl = document.getElementById('meta');
    const kAgentsEl = document.getElementById('kAgents');
    const kEventsEl = document.getElementById('kEvents');
    const kUpdatedEl = document.getElementById('kUpdated');
    const refreshBtn = document.getElementById('refreshBtn');

    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const palette = ['#87ffb2', '#7fc7ff', '#ffb37f', '#d69cff', '#f1ff93', '#ff8ca7', '#9bffd8', '#ffd17f'];
    const office = {
      w: 960,
      h: 540,
      desks: [],
      reading: { x: 840, y: 120 },
      waiting: { x: 840, y: 430 },
    };
    const agents = new Map();
    const deskByAgent = new Map();
    let lastTick = performance.now();
    let lastStateTs = '-';
    let state = { agents: [], events: [] };

    function hashString(input) {
      const s = String(input || '');
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }

    function timeLabel(ts) {
      if (!ts) return '-';
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toISOString().slice(11, 19);
    }

    function actionToMode(actionRaw) {
      const action = String(actionRaw || '').toLowerCase();
      if (action.includes('type') || action.includes('write') || action.includes('edit')) return 'typing';
      if (action.includes('read') || action.includes('search') || action.includes('analyze')) return 'reading';
      if (action.includes('wait') || action.includes('idle')) return 'waiting';
      if (action.includes('run') || action.includes('exec') || action.includes('cmd')) return 'running';
      return 'working';
    }

    function ensureLayout() {
      office.desks = [];
      const cols = 4;
      const rows = 3;
      const sx = 120;
      const sy = 120;
      const gx = 170;
      const gy = 125;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          office.desks.push({ x: sx + c * gx, y: sy + r * gy });
        }
      }
    }

    function chooseDesk(agentId) {
      if (deskByAgent.has(agentId)) return deskByAgent.get(agentId);
      const idx = hashString(agentId) % office.desks.length;
      deskByAgent.set(agentId, idx);
      return idx;
    }

    function targetByMode(agentId, mode) {
      if (mode === 'reading') return { ...office.reading };
      if (mode === 'waiting') return { ...office.waiting };
      const desk = office.desks[chooseDesk(agentId)] || office.desks[0];
      return { x: desk.x, y: desk.y + 6 };
    }

    function randomNear(point, radius) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      return {
        x: point.x + Math.cos(angle) * dist,
        y: point.y + Math.sin(angle) * dist,
      };
    }

    function clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(380, Math.floor(rect.width));
      const h = Math.max(260, Math.floor(rect.height));
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      office.w = w;
      office.h = h;
    }

    function upsertFromState(payload) {
      state = payload || { agents: [], events: [] };
      const seen = new Set();

      for (const item of (state.agents || [])) {
        const id = String(item.agent_id || item.agent_name || 'unknown');
        seen.add(id);

        const mode = actionToMode(item.action);
        const deskIndex = chooseDesk(id);
        const desk = office.desks[deskIndex] || { x: 90, y: 90 };
        const target = targetByMode(id, mode);
        let agent = agents.get(id);

        if (!agent) {
          const spawn = randomNear(desk, 80);
          agent = {
            id,
            name: item.agent_name || id,
            role: item.role || '-',
            mode,
            action: item.action || '-',
            source: item.source || '-',
            color: palette[hashString(id) % palette.length],
            x: spawn.x,
            y: spawn.y,
            tx: target.x,
            ty: target.y,
            step: 0,
            bubbleUntil: 0,
            wanderAt: performance.now() + 2000 + (hashString(id) % 2000),
          };
          agents.set(id, agent);
        } else {
          agent.name = item.agent_name || agent.name;
          agent.role = item.role || agent.role;
          agent.source = item.source || agent.source;
          agent.action = item.action || agent.action;
          agent.mode = mode;
          agent.tx = target.x;
          agent.ty = target.y;
        }

        if (mode === 'waiting') {
          agent.bubbleUntil = performance.now() + 2200;
        }
      }

      for (const [id] of agents.entries()) {
        if (!seen.has(id)) {
          agents.delete(id);
          deskByAgent.delete(id);
        }
      }

      const root = payload.root || '(no workspace)';
      const eventsPath = payload.eventsPath || '(no events path)';
      metaEl.textContent = root + ' • ' + eventsPath;
      kAgentsEl.textContent = 'agents: ' + (state.agents || []).length;
      kEventsEl.textContent = 'events: ' + (state.events || []).length;
      const latest = (state.events && state.events[0] && state.events[0].ts) || null;
      lastStateTs = latest ? timeLabel(latest) : '-';
      kUpdatedEl.textContent = 'updated: ' + lastStateTs;
    }

    function drawGrid() {
      ctx.fillStyle = '#0a120d';
      ctx.fillRect(0, 0, office.w, office.h);

      ctx.strokeStyle = 'rgba(104, 164, 120, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < office.w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, office.h);
        ctx.stroke();
      }
      for (let y = 0; y < office.h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(office.w, y + 0.5);
        ctx.stroke();
      }
    }

    function drawOffice() {
      drawGrid();

      // Reading zone
      ctx.fillStyle = '#11271c';
      ctx.fillRect(office.reading.x - 50, office.reading.y - 36, 98, 62);
      ctx.strokeStyle = '#3c6d4e';
      ctx.strokeRect(office.reading.x - 50, office.reading.y - 36, 98, 62);
      ctx.fillStyle = '#9cd7b0';
      ctx.fillText('READ', office.reading.x - 20, office.reading.y - 12);

      // Waiting zone
      ctx.fillStyle = '#2a2410';
      ctx.fillRect(office.waiting.x - 50, office.waiting.y - 36, 98, 62);
      ctx.strokeStyle = '#6e5f33';
      ctx.strokeRect(office.waiting.x - 50, office.waiting.y - 36, 98, 62);
      ctx.fillStyle = '#f7db8e';
      ctx.fillText('WAIT', office.waiting.x - 20, office.waiting.y - 12);

      // Desks
      for (const desk of office.desks) {
        ctx.fillStyle = '#14251b';
        ctx.fillRect(desk.x - 40, desk.y - 20, 80, 34);
        ctx.strokeStyle = '#3f6e50';
        ctx.strokeRect(desk.x - 40, desk.y - 20, 80, 34);

        ctx.fillStyle = '#203a2b';
        ctx.fillRect(desk.x - 12, desk.y - 30, 24, 8);
        ctx.fillStyle = '#6aeaa0';
        ctx.fillRect(desk.x - 9, desk.y - 28, 18, 4);

        ctx.fillStyle = '#111b14';
        ctx.fillRect(desk.x - 12, desk.y + 15, 24, 10);
      }
    }

    function stepAgent(agent, dt, now) {
      const dx = agent.tx - agent.x;
      const dy = agent.ty - agent.y;
      const dist = Math.hypot(dx, dy);
      const speed = agent.mode === 'running' ? 90 : 62;

      if (dist > 1.5) {
        const mv = Math.min(dist, speed * dt);
        agent.x += (dx / dist) * mv;
        agent.y += (dy / dist) * mv;
        agent.step += dt * 8;
      } else {
        agent.x = agent.tx;
        agent.y = agent.ty;
        if (agent.mode === 'working' && now > agent.wanderAt) {
          const desk = office.desks[chooseDesk(agent.id)] || { x: 90, y: 90 };
          const next = randomNear(desk, 34);
          agent.tx = clamp(next.x, 30, office.w - 30);
          agent.ty = clamp(next.y, 40, office.h - 28);
          agent.wanderAt = now + 2200 + (hashString(agent.id + String(now)) % 2000);
        }
      }
    }

    function drawAgent(agent, now) {
      const bob = Math.sin(agent.step) * 1.4;
      const x = Math.round(agent.x);
      const y = Math.round(agent.y + bob);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + 13, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = agent.color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#f6d8c1';
      ctx.beginPath();
      ctx.arc(x, y - 10, 6, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#0f1d15';
      const blink = Math.floor(now / 2200 + hashString(agent.id)) % 18 === 0;
      if (!blink) {
        ctx.fillRect(x - 3, y - 11, 1, 1);
        ctx.fillRect(x + 2, y - 11, 1, 1);
      }

      // Name
      ctx.fillStyle = '#d7f6df';
      ctx.font = '10px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(agent.name, x, y - 20);

      if (agent.mode === 'typing') {
        ctx.fillStyle = '#89ffb2';
        ctx.fillRect(x - 10, y + 4, 20, 2);
      }

      if (agent.bubbleUntil > now) {
        const bx = x + 12;
        const by = y - 22;
        ctx.fillStyle = '#f7e7b0';
        ctx.fillRect(bx, by, 20, 12);
        ctx.fillStyle = '#2a2410';
        ctx.fillText('...', bx + 10, by + 9);
      }
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;

      drawOffice();
      const list = [...agents.values()];
      list.sort((a, b) => a.y - b.y);

      for (const agent of list) {
        stepAgent(agent, dt, now);
        drawAgent(agent, now);
      }

      requestAnimationFrame(tick);
    }

    refreshBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || msg.type !== 'state') return;
      upsertFromState(msg.payload || {});
    });

    window.addEventListener('resize', () => {
      resizeCanvas();
      ensureLayout();
    });

    resizeCanvas();
    ensureLayout();
    requestAnimationFrame(tick);
  </script>
</body>
</html>`;
  }
}

function readEvents(eventsPath) {
  if (!eventsPath || !fs.existsSync(eventsPath)) return [];
  try {
    const raw = fs.readFileSync(eventsPath, 'utf8');
    if (!raw.trim()) return [];

    const lines = raw.split(/\r?\n/).filter(Boolean).slice(-MAX_EVENTS);
    const events = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object') {
          events.push(parsed);
        }
      } catch {
        // Keep panel resilient if malformed line exists.
      }
    }
    return events;
  } catch {
    return [];
  }
}

function buildState(events) {
  const agentsById = new Map();
  for (const event of events) {
    const id = event.agent_id || event.agent_name || 'unknown-agent';
    agentsById.set(id, event);
  }

  const agents = Array.from(agentsById.values())
    .sort((a, b) => {
      const ta = new Date(a.ts || 0).getTime();
      const tb = new Date(b.ts || 0).getTime();
      return tb - ta;
    })
    .slice(0, 16);

  const recentEvents = [...events]
    .sort((a, b) => {
      const ta = new Date(a.ts || 0).getTime();
      const tb = new Date(b.ts || 0).getTime();
      return tb - ta;
    })
    .slice(0, 120);

  return { agents, events: recentEvents };
}

module.exports = {
  activate,
  deactivate,
};
