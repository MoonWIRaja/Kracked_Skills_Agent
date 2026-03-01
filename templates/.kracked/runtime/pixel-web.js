#!/usr/bin/env node

let fs;
let path;
let http;
let childProcess;

const ROLE_MAP = {
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

const TASK_ROLE_MAP = {
  'kd-analyze': ['analyst'],
  'kd-brainstorm': ['analyst', 'pm'],
  'kd-prd': ['pm'],
  'kd-arch': ['architect', 'security'],
  'kd-story': ['tech-lead'],
  'kd-dev-story': ['engineer'],
  'kd-code-review': ['qa', 'security'],
  'kd-deploy': ['devops'],
  'kd-release': ['release-manager'],
  'kd-test': ['qa'],
  'kd-security-audit': ['security'],
  'kd-refactor': ['tech-lead', 'engineer'],
  'kd-sprint-planning': ['pm', 'tech-lead'],
  'kd-sprint-review': ['pm', 'qa'],
  'kd-validate': ['qa'],
};

const ROLE_HINTS = {
  analyst: ['analyst', 'analysis', 'discover', 'research'],
  pm: ['product', 'pm', 'prd', 'backlog'],
  architect: ['architect', 'architecture', 'api', 'schema'],
  'tech-lead': ['tech lead', 'tl', 'refactor'],
  engineer: ['engineer', 'developer', 'coding', 'implement'],
  qa: ['qa', 'quality', 'test'],
  security: ['security', 'audit', 'owasp'],
  devops: ['devops', 'deploy', 'pipeline'],
  'release-manager': ['release', 'changelog'],
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith('--')) continue;
    const k = t.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    out[k] = v;
  }
  return out;
}

function toPort(value, fallback) {
  const n = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(n) && n > 0 && n <= 65535 ? n : fallback;
}

function toBool(value, fallback = false) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function openUrl(url) {
  try {
    const target = String(url || '').trim();
    if (!target) return;
    if (process.platform === 'win32') {
      childProcess.spawn('cmd', ['/c', 'start', '', target], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      return;
    }
    if (process.platform === 'darwin') {
      childProcess.spawn('open', [target], { detached: true, stdio: 'ignore' }).unref();
      return;
    }
    childProcess.spawn('xdg-open', [target], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // Ignore browser-open failures.
  }
}

function eventTime(event) {
  const n = new Date(event && event.ts ? event.ts : 0).getTime();
  return Number.isFinite(n) ? n : 0;
}

function normalizeTask(rawTask) {
  let t = String(rawTask || '').trim().toLowerCase();
  if (!t) return '';
  t = t.split(/\s+/)[0];
  t = t.replace(/^\/+/, '').replace(/\.md$/, '').replace(/^kd_/, 'kd-');
  return t;
}

function rolesForTask(taskRaw) {
  const task = normalizeTask(taskRaw);
  if (!task) return [];
  if (TASK_ROLE_MAP[task]) return [...TASK_ROLE_MAP[task]];
  if (task.startsWith('kd-role-')) {
    const role = task.slice('kd-role-'.length);
    if (ROLE_MAP[role]) return [role];
  }
  for (const [k, roles] of Object.entries(TASK_ROLE_MAP)) {
    if (task.includes(k)) return [...roles];
  }
  return [];
}

function rolesFromText(raw) {
  const text = String(raw || '').toLowerCase();
  if (!text) return [];
  const out = new Set();
  for (const [role, hints] of Object.entries(ROLE_HINTS)) {
    if (hints.some((h) => text.includes(h))) out.add(role);
  }
  return [...out];
}

function roleFromTarget(rawTarget, roster) {
  const target = String(rawTarget || '').toLowerCase().trim();
  if (!target) return [];
  const segments = target.split(/[,\n;|]+/).map((s) => s.trim()).filter(Boolean);
  const roles = new Set();
  for (const seg of segments.length ? segments : [target]) {
    for (const role of Object.keys(ROLE_MAP)) {
      if (seg === role || seg === `${role}-agent`) roles.add(role);
    }
    for (const [role, name] of Object.entries((roster && roster.byRole) || {})) {
      if (String(name || '').toLowerCase() === seg) roles.add(role);
    }
    for (const role of rolesFromText(seg)) roles.add(role);
  }
  return [...roles];
}

function inferAction(rawAction, role) {
  const a = String(rawAction || '').toLowerCase();
  if (a.includes('wait') || a.includes('idle')) return 'waiting';
  if (role === 'engineer') return 'typing';
  if (role === 'devops') return 'running';
  return 'working';
}

function hasRoleActivity(events, role, name, sinceTs) {
  const id = `${role}-agent`;
  const lower = String(name || '').toLowerCase();
  return events.some((e) => {
    if (eventTime(e) < sinceTs) return false;
    const eId = String(e.agent_id || '').toLowerCase();
    const eName = String(e.agent_name || '').toLowerCase();
    const eRole = String(e.role || '').toLowerCase();
    return eId === id || eName === lower || eRole.includes(role);
  });
}

function isMain(event) {
  const id = String((event && event.agent_id) || '').toLowerCase();
  const role = String((event && event.role) || '').toLowerCase();
  return id === 'main-agent' || role.includes('master') || role.includes('main');
}

function synthesizeDelegation(events, roster) {
  if (!Array.isArray(events) || events.length === 0) return [];
  const synthetic = [];
  const latestMain = [...events].filter(isMain).sort((a, b) => eventTime(b) - eventTime(a))[0];

  if (latestMain) {
    const roles = new Set([
      ...rolesForTask(latestMain.task),
      ...rolesFromText(latestMain.message),
      ...rolesFromText(latestMain.action),
    ]);

    if (roles.size === 0) {
      const sig = `${latestMain.action || ''} ${latestMain.message || ''}`.toLowerCase();
      if (/(delegat|consult|ask|help|assist)/.test(sig)) roles.add('analyst');
    }

    const ts = eventTime(latestMain);
    for (const role of roles) {
      const name = (roster.byRole && roster.byRole[role]) || ROLE_MAP[role] || 'Professional Agent';
      if (hasRoleActivity(events, role, name, ts)) continue;
      synthetic.push({
        ts: latestMain.ts || new Date().toISOString(),
        agent_id: `${role}-agent`,
        agent_name: name,
        role: ROLE_MAP[role] || 'Professional Agent',
        action: inferAction(latestMain.action, role),
        source: latestMain.source || 'kd',
        task: latestMain.task || '',
        message: `${name} handling delegated task`,
      });
    }
  }

  const byRole = new Map();
  for (const event of events) {
    if (!event || !event.target_agent_id) continue;
    const roles = roleFromTarget(event.target_agent_id, roster);
    for (const role of roles) {
      const cur = byRole.get(role);
      if (!cur || eventTime(event) >= eventTime(cur)) byRole.set(role, event);
    }
  }

  for (const [role, parent] of byRole.entries()) {
    const name = (roster.byRole && roster.byRole[role]) || ROLE_MAP[role] || 'Professional Agent';
    if (hasRoleActivity(events, role, name, eventTime(parent))) continue;
    synthetic.push({
      ts: parent.ts || new Date().toISOString(),
      agent_id: `${role}-agent`,
      agent_name: name,
      role: ROLE_MAP[role] || 'Professional Agent',
      action: inferAction(parent.action, role),
      source: parent.source || 'kd',
      task: parent.task || '',
      message: `${name} responding to main-agent delegation`,
    });
  }

  return synthetic.length > 0 ? [...events, ...synthetic] : events;
}

function readEvents(eventsPath, maxHistory = 1600) {
  if (!fs.existsSync(eventsPath)) return [];
  const lines = fs.readFileSync(eventsPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(-maxHistory);
  const events = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object') events.push(parsed);
    } catch {
      // ignore malformed line
    }
  }
  return events;
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
        if (typeof name === 'string' && name.trim()) byRole[role] = name.trim();
      }
    }
    return { byRole };
  } catch {
    return defaults;
  }
}

function buildState(events, roster) {
  const stream = synthesizeDelegation(events, roster);
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
        source: String(event.source || '-'),
      });
    }
    const a = byAgent.get(id);
    const action = String(event.action || 'unknown');
    a.name = String(event.agent_name || a.name);
    a.role = String(event.role || a.role);
    a.source = String(event.source || a.source);
    a.total += 1;
    a.last_ts = event.ts || a.last_ts;
    a.last_action = action;
    a.last_task = String(event.task || '');
    a.last_message = String(event.message || '');
    a.actions[action] = (a.actions[action] || 0) + 1;
  }
  const agents = [...byAgent.values()].sort((a, b) => {
    if (a.id === 'main-agent' && b.id !== 'main-agent') return -1;
    if (b.id === 'main-agent' && a.id !== 'main-agent') return 1;
    return b.total - a.total;
  });
  return {
    total_events: stream.length,
    agents,
    recent: stream.slice(-120).reverse(),
    updated_at: new Date().toISOString(),
  };
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.bmp': return 'image/bmp';
    case '.svg': return 'image/svg+xml';
    case '.ttf': return 'font/ttf';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

function injectWebPlaceholders(htmlText) {
  const html = String(htmlText || '');
  return html
    .replace(/__KD_DIST_BASE__/g, '.')
    .replace(/__KD_ASSET_BASE__/g, './kd-asset-pack')
    .replace(/__KD_CATALOG_URI__/g, './kd-asset-pack/catalog.json')
    .replace(/__KD_MANIFEST_URI__/g, './kd-asset-pack/manifest.json');
}

function safeStaticPath(rootDir, requestPath) {
  const clean = String(requestPath || '/').split('?')[0].split('#')[0];
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, rel);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== path.join(resolvedRoot, 'index.html')) {
    return null;
  }
  return resolvedPath;
}

function htmlFallback() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>KD Pixel Web</title>
  <style>
    body{margin:0;padding:20px;background:#0a1022;color:#d7e6ff;font-family:Consolas,monospace}
    .box{max-width:760px;border:1px solid #43639b;padding:16px;background:#101934}
    code{color:#9fd0ff}
  </style>
</head>
<body>
  <div class="box">
    <h3>KD Pixel web bundle not ready</h3>
    <p>Run <code>kd-panel-install.bat</code> or rebuild asset bundle from <code>Assets.zip</code>.</p>
  </div>
</body>
</html>`;
}

function ensurePanelAssets(panelToolDir, workspaceRoot) {
  const catalogPath = path.join(panelToolDir, 'dist', 'webview', 'kd-asset-pack', 'catalog.json');
  if (fs.existsSync(catalogPath)) return { ok: true, built: false };

  const builder = path.join(panelToolDir, 'build-assets-from-zip.js');
  if (!fs.existsSync(builder)) {
    return { ok: false, reason: 'builder script not found' };
  }

  const nodeExe = process.execPath || 'node';
  const args = [builder, '--workspace', workspaceRoot];
  const result = childProcess.spawnSync(nodeExe, args, {
    cwd: panelToolDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    const reason = (result.stderr || result.stdout || '').trim() || `exit code ${result.status}`;
    return { ok: false, reason: `asset build failed: ${reason}` };
  }

  if (!fs.existsSync(catalogPath)) {
    return { ok: false, reason: 'catalog not generated' };
  }

  return { ok: true, built: true };
}

async function main() {
  fs = await import('node:fs');
  path = await import('node:path');
  http = await import('node:http');
  childProcess = await import('node:child_process');

  const args = parseArgs(process.argv.slice(2));
  const requestedPort = toPort(args.port, 4892);
  const autoOpen = toBool(args.open, false);

  const cwdRuntime = path.join(process.cwd(), '.kracked', 'runtime');
  const scriptDir = path.dirname(process.argv[1] || process.cwd());
  const runtimeDir = fs.existsSync(cwdRuntime) ? cwdRuntime : scriptDir;
  const eventsPath = path.join(runtimeDir, 'events.jsonl');
  const roster = loadAgentRoster(runtimeDir);

  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, '', 'utf8');

  const krackedDir = path.dirname(runtimeDir);
  const workspaceRoot = path.dirname(krackedDir);
  const panelToolDir = path.join(krackedDir, 'tools', 'vscode-kd-pixel-panel');
  const panelWebRoot = path.join(panelToolDir, 'dist', 'webview');

  let panelReady = fs.existsSync(path.join(panelWebRoot, 'index.html'));
  if (panelReady) {
    const buildResult = ensurePanelAssets(panelToolDir, workspaceRoot);
    if (!buildResult.ok) {
      process.stdout.write(`[KD][warn] ${buildResult.reason}\n`);
      panelReady = false;
    } else if (buildResult.built) {
      process.stdout.write('[KD] Panel assets rebuilt from Assets.zip\n');
    }
  }

  const server = http.createServer((req, res) => {
    const url = req.url || '/';

    if (url.startsWith('/api/state')) {
      const state = buildState(readEvents(eventsPath), roster);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(state));
      return;
    }

    if (url.startsWith('/api/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, service: 'kd-pixel-web', ts: new Date().toISOString() }));
      return;
    }

    if (!panelReady) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlFallback());
      return;
    }

    const staticFile = safeStaticPath(panelWebRoot, url);
    if (!staticFile || !fs.existsSync(staticFile) || !fs.statSync(staticFile).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    try {
      let data = fs.readFileSync(staticFile);
      if (/index\.html$/i.test(staticFile)) {
        data = Buffer.from(injectWebPlaceholders(data.toString('utf8')), 'utf8');
      }
      res.writeHead(200, {
        'Content-Type': mimeType(staticFile),
        'Cache-Control': /\.json$/i.test(staticFile) ? 'no-store' : 'public, max-age=300',
      });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Failed to read file: ${err && err.message ? err.message : 'unknown error'}`);
    }
  });

  let activePort = requestedPort;
  let retries = 0;
  const maxRetries = 20;

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && retries < maxRetries && activePort < 65535) {
      const nextPort = activePort + 1;
      retries += 1;
      process.stdout.write(`[KD][warn] Port ${activePort} already in use. Retrying on ${nextPort}...\n`);
      activePort = nextPort;
      setTimeout(() => {
        server.listen(activePort);
      }, 80);
      return;
    }
    process.stderr.write(`[KD] pixel-web error: ${err && err.message ? err.message : String(err)}\n`);
    process.exit(1);
  });

  server.listen(activePort, () => {
    const url = `http://localhost:${activePort}`;
    process.stdout.write(`[KD] KD RPG WORLD web observer running at ${url}\n`);
    process.stdout.write('[KD] Press Ctrl+C to stop.\n');
    if (autoOpen) openUrl(url);
  });
}

main().catch((err) => {
  process.stderr.write(`[KD] pixel-web error: ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
});
