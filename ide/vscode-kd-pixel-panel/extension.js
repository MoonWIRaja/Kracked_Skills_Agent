const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const MAX_EVENTS = 200;
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
    this.view.webview.options = {
      enableScripts: true,
    };
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
    const configured = vscode.workspace.getConfiguration('kdPixel').get('eventsPath', '.kracked/runtime/events.jsonl');
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
      --bg: #08110b;
      --panel: #102118;
      --line: #2f553c;
      --text: #d6f7db;
      --muted: #89b691;
      --good: #7ef29a;
      --warn: #ffe082;
      --danger: #ff8f8f;
      --accent: #6bc48a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      color: var(--text);
      background:
        linear-gradient(rgba(76,140,95,0.09) 1px, transparent 1px),
        linear-gradient(90deg, rgba(76,140,95,0.08) 1px, transparent 1px),
        var(--bg);
      background-size: 24px 24px, 24px 24px, auto;
    }
    .wrap { padding: 12px; display: grid; gap: 12px; }
    .header, .panel {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(13, 30, 21, 0.92);
      box-shadow: 0 0 0 1px rgba(88,156,106,0.1) inset;
    }
    .header { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .title { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--good); }
    .meta { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    button {
      border: 1px solid var(--line);
      background: #153321;
      color: var(--text);
      border-radius: 7px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    .grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; }
    .panel h3 {
      margin: 0;
      padding: 9px 10px;
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--good);
      border-bottom: 1px solid var(--line);
    }
    .content { padding: 8px; max-height: 62vh; overflow: auto; }
    .agent {
      border: 1px solid #264734;
      background: #0f1f15;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
    }
    .agent-top { display: flex; justify-content: space-between; gap: 8px; }
    .agent-name { font-size: 12px; font-weight: 700; color: var(--text); }
    .agent-role { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .badge { font-size: 10px; text-transform: uppercase; color: #001b0c; background: var(--good); padding: 2px 6px; border-radius: 999px; }
    .action {
      margin-top: 6px;
      font-size: 11px;
      color: var(--accent);
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .event {
      border-bottom: 1px dashed #2a4c36;
      padding: 7px 0;
      font-size: 11px;
    }
    .event:last-child { border-bottom: 0; }
    .event-head { color: var(--muted); margin-bottom: 3px; }
    .event-body { color: var(--text); }
    .empty {
      color: var(--warn);
      font-size: 12px;
      white-space: pre-line;
      line-height: 1.45;
    }
    .status {
      padding: 0 10px 10px 10px;
      font-size: 11px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <div class="title">KD Pixel Observer (Native Panel)</div>
        <div class="meta" id="meta">Waiting for workspace...</div>
      </div>
      <button id="refreshBtn">Refresh</button>
    </div>

    <div class="grid">
      <section class="panel">
        <h3>Agent Swarm</h3>
        <div class="content" id="agents"></div>
      </section>
      <section class="panel">
        <h3>Recent Events</h3>
        <div class="content" id="events"></div>
      </section>
    </div>
    <div class="status" id="status">No updates yet.</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const agentsEl = document.getElementById('agents');
    const eventsEl = document.getElementById('events');
    const metaEl = document.getElementById('meta');
    const statusEl = document.getElementById('status');
    const refreshBtn = document.getElementById('refreshBtn');

    refreshBtn.addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));

    function escapeHtml(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function renderAgents(agents) {
      if (!agents || agents.length === 0) {
        agentsEl.innerHTML = '<div class="empty">No agent events yet.</div>';
        return;
      }

      agentsEl.innerHTML = agents.map((agent) => {
        const action = escapeHtml(agent.action || 'idle');
        const time = escapeHtml(agent.ts || '-');
        return \`
          <div class="agent">
            <div class="agent-top">
              <div>
                <div class="agent-name">\${escapeHtml(agent.agent_name)}</div>
                <div class="agent-role">\${escapeHtml(agent.role || '-')}</div>
              </div>
              <span class="badge">\${action}</span>
            </div>
            <div class="action">
              <span>source: \${escapeHtml(agent.source || '-')}</span>
              <span>\${time}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderEvents(events) {
      if (!events || events.length === 0) {
        eventsEl.innerHTML = '<div class="empty">No events in stream yet.\\n\\nTry command in IDE then emit:\\nnode .kracked/runtime/emit-event.js --source antigravity --agent-id main-agent --agent-name Moon --role "Master Agent" --action typing --task kd-analyze</div>';
        return;
      }

      eventsEl.innerHTML = events.map((evt) => {
        return \`
          <div class="event">
            <div class="event-head">[\${escapeHtml(evt.ts || '-')}] \${escapeHtml(evt.source || '-')}</div>
            <div class="event-body"><strong>\${escapeHtml(evt.agent_name || evt.agent_id || 'agent')}</strong> • \${escapeHtml(evt.action || 'idle')} • \${escapeHtml(evt.task || '-')}</div>
            \${evt.message ? \`<div class="event-body">\${escapeHtml(evt.message)}</div>\` : ''}
          </div>
        \`;
      }).join('');
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || msg.type !== 'state') return;
      const payload = msg.payload || {};
      renderAgents(payload.agents || []);
      renderEvents(payload.events || []);
      metaEl.textContent = \`\${payload.root || '(no workspace)'} • \${payload.eventsPath || '(no events path)'}\`;
      statusEl.textContent = \`Agents: \${(payload.agents || []).length} • Events: \${(payload.events || []).length}\`;
    });
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
        // Ignore malformed lines so panel remains resilient.
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
    .slice(0, 12);

  const recentEvents = [...events]
    .sort((a, b) => {
      const ta = new Date(a.ts || 0).getTime();
      const tb = new Date(b.ts || 0).getTime();
      return tb - ta;
    })
    .slice(0, 80);

  return { agents, events: recentEvents };
}

module.exports = {
  activate,
  deactivate,
};
