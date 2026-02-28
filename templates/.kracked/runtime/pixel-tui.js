#!/usr/bin/env node

let fs;
let path;
let readline;

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const BRIGHT_GREEN = '\x1b[92m';
const DIM = '\x1b[90m';
const BOLD = '\x1b[1m';

function color(code, text) {
  return `${code}${text}${RESET}`;
}

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

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function fit(text, width) {
  const raw = String(text || '');
  if (raw.length > width) return `${raw.slice(0, Math.max(0, width - 3))}...`;
  return `${raw}${' '.repeat(width - raw.length)}`;
}

function fmtTime(ts) {
  if (!ts) return '-';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toISOString().slice(11, 19);
}

function readEvents(eventsPath, maxHistory) {
  if (!fs.existsSync(eventsPath)) return [];

  const lines = fs.readFileSync(eventsPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const parsed = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event && typeof event === 'object') parsed.push(event);
    } catch {
      // Skip malformed lines.
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

function buildAgentRows(events) {
  const byAgent = new Map();

  for (const event of events) {
    const id = String(event.agent_id || event.agent_name || 'unknown');
    if (!byAgent.has(id)) {
      byAgent.set(id, {
        id,
        name: String(event.agent_name || id),
        role: String(event.role || '-'),
        action: String(event.action || '-'),
        count: 0,
        ts: event.ts || null,
      });
    }

    const row = byAgent.get(id);
    row.count += 1;
    row.name = String(event.agent_name || row.name);
    row.role = String(event.role || row.role);
    row.action = String(event.action || row.action);
    row.ts = event.ts || row.ts;
  }

  return [...byAgent.values()].sort((a, b) => {
    if (a.id === 'main-agent' && b.id !== 'main-agent') return -1;
    if (b.id === 'main-agent' && a.id !== 'main-agent') return 1;
    return b.count - a.count;
  });
}

function render(eventsPath, intervalMs, maxEvents, maxHistory, roster) {
  const events = synthesizeDelegationEvents(readEvents(eventsPath, maxHistory), roster);
  const agents = buildAgentRows(events);
  const recent = events.slice(-maxEvents).reverse();

  const width = 96;
  const border = `+${'-'.repeat(width - 2)}+`;
  const innerWidth = width - 4;
  const row = (text) => `| ${fit(text, innerWidth)} |`;

  const lines = [
    border,
    row('[KD PIXEL TUI] CYBERPUNK OBSERVER'),
    row(`events: ${eventsPath}`),
    row(`refresh: ${intervalMs}ms | max-events: ${maxEvents} | max-history: ${maxHistory} | quit: q`),
    border,
    row(`[AGENTS ONLINE] ${agents.length}`),
  ];

  if (agents.length === 0) {
    lines.push(row('Waiting for events...'));
  } else {
    lines.push(row('name                 role                 action               total  last'));
    for (const agent of agents.slice(0, 10)) {
      const data = `${fit(agent.name, 20)} ${fit(agent.role, 20)} ${fit(agent.action, 18)} ${fit(
        String(agent.count),
        6
      )} ${fit(fmtTime(agent.ts), 8)}`;
      lines.push(row(data));
    }
  }

  lines.push(border);
  lines.push(row(`[RECENT EVENTS] ${recent.length}`));

  if (recent.length === 0) {
    lines.push(row('No events yet.'));
  } else {
    for (const event of recent) {
      const summary = `${fit(fmtTime(event.ts), 8)} ${fit(event.agent_name || event.agent_id || '-', 16)} ${fit(
        event.action || '-',
        12
      )} ${fit(event.task || '-', 16)} ${fit(event.message || '-', 36)}`;
      lines.push(row(summary));
    }
  }

  lines.push(border);

  const painted = lines.map((line, index) => {
    if (index === 0 || index === lines.length - 1) return color(BRIGHT_GREEN + BOLD, line);
    if (line === border) return color(BRIGHT_GREEN, line);
    return color(GREEN, line);
  });

  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(`${painted.join('\n')}\n`);
  process.stdout.write(color(DIM, 'Press q to quit. Waiting for new events...\n'));
}

async function main() {
  fs = await import('node:fs');
  path = await import('node:path');
  readline = await import('node:readline');

  const args = parseArgs(process.argv.slice(2));
  const intervalMs = toPositiveInt(args.interval, 1000);
  const maxEvents = toPositiveInt(args['max-events'] || args.maxEvents, 12);
  const maxHistory = toPositiveInt(args['max-history'] || args.maxHistory, 250);

  const cwdRuntime = path.join(process.cwd(), '.kracked', 'runtime');
  const scriptDir = path.dirname(process.argv[1] || process.cwd());
  const runtimeDir = fs.existsSync(cwdRuntime) ? cwdRuntime : scriptDir;
  const eventsPath = path.join(runtimeDir, 'events.jsonl');
  const roster = loadAgentRoster(runtimeDir);

  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(eventsPath)) {
    fs.writeFileSync(eventsPath, '', 'utf8');
  }

  const supportsRaw = Boolean(process.stdin.isTTY && typeof process.stdin.setRawMode === 'function');
  let timer = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    if (supportsRaw) process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\n');
    process.exit(0);
  };

  if (supportsRaw) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', (str, key) => {
      if (str === 'q' || str === 'Q') stop();
      if (key && key.ctrl && key.name === 'c') stop();
    });
  }

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  render(eventsPath, intervalMs, maxEvents, maxHistory, roster);
  timer = setInterval(() => {
    render(eventsPath, intervalMs, maxEvents, maxHistory, roster);
  }, intervalMs);
}

main().catch((err) => {
  process.stderr.write(`[KD] pixel-tui error: ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
});
