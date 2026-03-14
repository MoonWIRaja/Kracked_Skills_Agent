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
  'ui-ux-frontend': 'UI/UX Frontend',
  'backend-api': 'Backend/API',
};

const TASK_ROLE_MAP = {
  'kd-analyze': ['analyst', 'ui-ux-frontend', 'backend-api'],
  'kd-brainstorm': ['analyst', 'pm', 'ui-ux-frontend', 'backend-api', 'architect', 'security', 'devops'],
  'kd-prd': ['pm', 'analyst'],
  'kd-arch': ['architect', 'ui-ux-frontend', 'backend-api', 'security', 'devops'],
  'kd-story': ['tech-lead', 'pm'],
  'kd-sprint-planning': ['pm', 'tech-lead', 'engineer'],
  'kd-dev-story': ['engineer', 'tech-lead', 'qa'],
  'kd-test': ['qa', 'engineer'],
  'kd-refactor': ['tech-lead', 'engineer'],
  'kd-code-review': ['qa', 'security', 'architect'],
  'kd-validate': ['pm', 'qa'],
  'kd-deploy': ['devops', 'security'],
  'kd-release': ['release-manager', 'devops'],
  'kd-sprint-review': ['pm', 'tech-lead', 'qa'],
  'kd-retrospective': ['release-manager', 'pm', 'tech-lead'],
  'kd-api-design': ['backend-api', 'architect', 'security'],
  'kd-db-schema': ['backend-api', 'architect'],
  'kd-security-audit': ['security', 'architect', 'qa'],
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    out[key] = next && !next.startsWith('--') ? argv[(i += 1)] : 'true';
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
    if (process.platform === 'win32') {
      childProcess.spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
      return;
    }
    if (process.platform === 'darwin') {
      childProcess.spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
      return;
    }
    childProcess.spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // Ignore browser-open failures.
  }
}

function eventTime(event) {
  const ts = new Date(event && event.ts ? event.ts : 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function readJsonLines(filePath, maxHistory = 1600) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-maxHistory)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line);
        return parsed && typeof parsed === 'object' ? [parsed] : [];
      } catch {
        return [];
      }
    });
}

function normalizeTask(rawTask) {
  return String(rawTask || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/\.md$/, '')
    .replace(/^kd_/, 'kd-');
}

function rolesFromTask(task) {
  return TASK_ROLE_MAP[normalizeTask(task)] || [];
}

function loadAgentRoster(runtimeDir) {
  const rosterPath = path.join(path.dirname(runtimeDir), 'config', 'agents.json');
  const fallback = {
    main: { id: 'main-agent', name: 'Main Agent', role: 'Master Agent', mention: '@main-agent' },
    byRole: Object.fromEntries(Object.entries(ROLE_MAP).map(([role, label]) => [role, label])),
    detailsByRole: Object.fromEntries(
      Object.entries(ROLE_MAP).map(([role, label]) => [
        role,
        {
          id: `${role}-agent`,
          role,
          name: label,
          mention: `@${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        },
      ])
    ),
  };

  if (!fs.existsSync(rosterPath)) return fallback;

  try {
    const parsed = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      main: parsed.main || fallback.main,
      byRole: { ...fallback.byRole, ...(parsed.byRole || {}) },
      detailsByRole: { ...fallback.detailsByRole, ...(parsed.detailsByRole || {}) },
      professional: Array.isArray(parsed.professional) ? parsed.professional : [],
    };
  } catch {
    return fallback;
  }
}

function loadXp(runtimeDir) {
  const xpPath = path.join(path.dirname(runtimeDir), 'security', 'xp.json');
  if (!fs.existsSync(xpPath)) return { level: 1, xp: 0, agent: null };
  try {
    return JSON.parse(fs.readFileSync(xpPath, 'utf8'));
  } catch {
    return { level: 1, xp: 0, agent: null };
  }
}

function readStatus(projectRoot) {
  const statusPath = path.join(projectRoot, 'KD_output', 'status', 'status.md');
  if (!fs.existsSync(statusPath)) return { text: '', updated_at: null };
  const stat = fs.statSync(statusPath);
  return {
    text: fs.readFileSync(statusPath, 'utf8'),
    updated_at: stat.mtime.toISOString(),
  };
}

function extractNextCommand(text) {
  const match = String(text || '').match(/Next command:\s*(\/kd-[\w-]+)/i);
  return match ? match[1] : null;
}

function buildProjectSummary(projectRoot, roster, xp, transcripts) {
  const status = readStatus(projectRoot);
  const latestTranscript = transcripts[transcripts.length - 1] || null;
  return {
    main_agent: roster.main && roster.main.name ? roster.main.name : 'Main Agent',
    current_stage: latestTranscript && latestTranscript.stage ? latestTranscript.stage : null,
    recent_command: latestTranscript && latestTranscript.command ? latestTranscript.command : null,
    next_command: extractNextCommand(status.text),
    level: Number.isFinite(xp.level) ? xp.level : 1,
    xp: Number.isFinite(xp.xp) ? xp.xp : 0,
    status_excerpt: String(status.text || '').trim().slice(0, 320),
    updated_at: (latestTranscript && latestTranscript.ts) || status.updated_at || new Date().toISOString(),
  };
}

function buildAgentRows(events, transcripts, roster, xp) {
  const rows = new Map();

  const ensure = (id, name, role) => {
    if (!rows.has(id)) {
      rows.set(id, {
        id,
        name,
        role,
        total_events: 0,
        total_messages: 0,
        last_action: 'idle',
        last_task: '',
        last_message: '',
        last_ts: null,
        mention: null,
        level: 1,
        xp: 0,
      });
    }
    return rows.get(id);
  };

  const mainRow = ensure('main-agent', roster.main.name || 'Main Agent', 'Master Agent');
  mainRow.mention = roster.main.mention || '@main-agent';
  mainRow.level = Number.isFinite(xp.level) ? xp.level : 1;
  mainRow.xp = Number.isFinite(xp.xp) ? xp.xp : 0;

  for (const [role, details] of Object.entries(roster.detailsByRole || {})) {
    const row = ensure(`${role}-agent`, details.name || ROLE_MAP[role] || role, ROLE_MAP[role] || role);
    row.mention = details.mention || null;
  }

  for (const event of events) {
    const id = String(event.agent_id || 'unknown');
    const row = ensure(id, String(event.agent_name || id), String(event.role || '-'));
    row.name = String(event.agent_name || row.name);
    row.role = String(event.role || row.role);
    row.total_events += 1;
    row.last_action = String(event.action || row.last_action);
    row.last_task = String(event.task || row.last_task);
    row.last_message = String(event.message || row.last_message);
    row.last_ts = event.ts || row.last_ts;
  }

  for (const line of transcripts) {
    const id = String(line.speaker_id || 'unknown');
    const row = ensure(id, String(line.speaker_name || id), String(line.speaker_role || '-'));
    row.name = String(line.speaker_name || row.name);
    row.role = String(line.speaker_role || row.role);
    row.total_messages += 1;
    row.last_task = String(line.command || row.last_task);
    row.last_message = String(line.text || row.last_message);
    row.last_ts = line.ts || row.last_ts;
  }

  return [...rows.values()].sort((a, b) => {
    if (a.id === 'main-agent' && b.id !== 'main-agent') return -1;
    if (b.id === 'main-agent' && a.id !== 'main-agent') return 1;
    return eventTime({ ts: b.last_ts }) - eventTime({ ts: a.last_ts });
  });
}

function buildState(events, transcripts, roster, summary, xp) {
  return {
    total_events: events.length,
    total_transcripts: transcripts.length,
    agents: buildAgentRows(events, transcripts, roster, xp),
    recent: events.slice(-120).reverse(),
    recent_transcripts: transcripts.slice(-40).reverse(),
    roster,
    project_summary: summary,
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
    case '.svg': return 'image/svg+xml';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

function safeStaticPath(rootDir, requestPath) {
  const clean = String(requestPath || '/').split('?')[0].split('#')[0];
  let rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  try {
    rel = decodeURIComponent(rel);
  } catch {
    // keep raw path if decode fails
  }
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
    body{margin:0;padding:20px;background:#08110d;color:#dbf7df;font-family:Consolas,monospace}
    .box{max-width:760px;border:1px solid #2d5e3c;padding:16px;background:#102116}
    code{color:#9fd0ff}
  </style>
</head>
<body>
  <div class="box">
    <h3>KD Pixel web bundle not ready</h3>
    <p>The observer API is live. Package the panel bundle if you want the native visual shell.</p>
  </div>
</body>
</html>`;
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
  const transcriptsPath = path.join(runtimeDir, 'transcripts.jsonl');
  const projectRoot = path.dirname(path.dirname(runtimeDir));
  const roster = loadAgentRoster(runtimeDir);
  const xp = loadXp(runtimeDir);

  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, '', 'utf8');
  if (!fs.existsSync(transcriptsPath)) fs.writeFileSync(transcriptsPath, '', 'utf8');

  const panelToolDir = path.join(path.dirname(runtimeDir), 'tools', 'vscode-kd-pixel-panel');
  const panelWebRoot = path.join(panelToolDir, 'dist', 'webview');
  const layoutPath = path.join(runtimeDir, 'layout.json');
  const panelReady = fs.existsSync(path.join(panelWebRoot, 'index.html'));

  function readLayout() {
    if (fs.existsSync(layoutPath)) {
      try {
        return JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
      } catch {
        // ignore
      }
    }
    const defaultLayoutPath = path.join(panelWebRoot, 'assets', 'default-layout.json');
    if (!fs.existsSync(defaultLayoutPath)) return null;
    try {
      const parsed = JSON.parse(fs.readFileSync(defaultLayoutPath, 'utf8'));
      fs.writeFileSync(layoutPath, JSON.stringify(parsed, null, 2), 'utf8');
      return parsed;
    } catch {
      return null;
    }
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const events = readJsonLines(eventsPath, 1600);
    const transcripts = readJsonLines(transcriptsPath, 1600);
    const summary = buildProjectSummary(projectRoot, roster, xp, transcripts);
    const state = buildState(events, transcripts, roster, summary, xp);

    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, service: 'kd-pixel-web', ts: new Date().toISOString() }));
      return;
    }

    if (url.pathname === '/api/state') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(state));
      return;
    }

    if (url.pathname === '/api/roster') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(roster));
      return;
    }

    if (url.pathname === '/api/project-summary') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(summary));
      return;
    }

    if (url.pathname === '/api/transcripts/recent') {
      const limit = Number.parseInt(url.searchParams.get('limit') || '20', 10);
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 20;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ transcripts: transcripts.slice(-safeLimit).reverse() }));
      return;
    }

    if (url.pathname.startsWith('/api/transcripts/')) {
      const runId = decodeURIComponent(url.pathname.slice('/api/transcripts/'.length));
      const items = transcripts.filter((line) => String(line.run_id || '') === runId);
      if (items.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Transcript not found', run_id: runId }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ run_id: runId, transcripts: items }));
      return;
    }

    if (url.pathname === '/api/layout' && req.method === 'GET') {
      const layout = readLayout();
      if (!layout) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, reason: 'layout not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(layout));
      return;
    }

    if (url.pathname === '/api/layout' && req.method === 'POST') {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk.toString('utf8');
        if (raw.length > 4 * 1024 * 1024) req.destroy();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(raw || '{}');
          fs.writeFileSync(layoutPath, JSON.stringify(parsed, null, 2), 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, reason: error && error.message ? error.message : 'invalid json' }));
        }
      });
      return;
    }

    if (!panelReady) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlFallback());
      return;
    }

    const staticFile = safeStaticPath(panelWebRoot, url.pathname);
    if (!staticFile || !fs.existsSync(staticFile) || !fs.statSync(staticFile).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    try {
      const data = fs.readFileSync(staticFile);
      res.writeHead(200, {
        'Content-Type': mimeType(staticFile),
        'Cache-Control': /\.json$/i.test(staticFile) ? 'no-store' : 'public, max-age=300',
      });
      res.end(data);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Failed to read file: ${error && error.message ? error.message : 'unknown error'}`);
    }
  });

  let activePort = requestedPort;
  let retries = 0;
  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE' && retries < 20 && activePort < 65535) {
      retries += 1;
      activePort += 1;
      setTimeout(() => server.listen(activePort), 80);
      return;
    }
    process.stderr.write(`[KD] pixel-web error: ${error && error.message ? error.message : String(error)}\n`);
    process.exit(1);
  });

  server.listen(activePort, () => {
    const url = `http://localhost:${activePort}`;
    process.stdout.write(`[KD] KD Pixel web observer running at ${url}\n`);
    if (autoOpen) openUrl(url);
  });
}

main().catch((error) => {
  process.stderr.write(`[KD] pixel-web error: ${error && error.message ? error.message : String(error)}\n`);
  process.exit(1);
});
