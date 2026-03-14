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
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    out[key] = next && !next.startsWith('--') ? argv[(i += 1)] : 'true';
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

function readJsonLines(filePath, maxHistory) {
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

function extractNextCommand(text) {
  const match = String(text || '').match(/Next command:\s*(\/kd-[\w-]+)/i);
  return match ? match[1] : '-';
}

function readStatus(projectRoot) {
  const statusPath = path.join(projectRoot, 'KD_output', 'status', 'status.md');
  if (!fs.existsSync(statusPath)) return { text: '', updated_at: null };
  return {
    text: fs.readFileSync(statusPath, 'utf8'),
    updated_at: fs.statSync(statusPath).mtime.toISOString(),
  };
}

function loadAgentRoster(runtimeDir) {
  const rosterPath = path.join(path.dirname(runtimeDir), 'config', 'agents.json');
  if (!fs.existsSync(rosterPath)) {
    return { main: { name: 'Main Agent' }, detailsByRole: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  } catch {
    return { main: { name: 'Main Agent' }, detailsByRole: {} };
  }
}

function loadXp(runtimeDir) {
  const xpPath = path.join(path.dirname(runtimeDir), 'security', 'xp.json');
  if (!fs.existsSync(xpPath)) return { level: 1, xp: 0 };
  try {
    return JSON.parse(fs.readFileSync(xpPath, 'utf8'));
  } catch {
    return { level: 1, xp: 0 };
  }
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
        last: '-',
        ts: null,
      });
    }
    return rows.get(id);
  };

  const main = ensure('main-agent', (roster.main && roster.main.name) || 'Main Agent', 'Master Agent');
  main.total_messages = Number.isFinite(xp.xp) ? xp.xp : 0;
  main.last = `LV ${Number.isFinite(xp.level) ? xp.level : 1}`;

  for (const [role, details] of Object.entries(roster.detailsByRole || {})) {
    ensure(`${role}-agent`, details.name || role, role);
  }

  for (const event of events) {
    const row = ensure(String(event.agent_id || 'unknown'), String(event.agent_name || 'unknown'), String(event.role || '-'));
    row.total_events += 1;
    row.last = String(event.action || row.last);
    row.ts = event.ts || row.ts;
  }

  for (const line of transcripts) {
    const row = ensure(String(line.speaker_id || 'unknown'), String(line.speaker_name || 'unknown'), String(line.speaker_role || '-'));
    row.total_messages += 1;
    row.last = String(line.command || row.last);
    row.ts = line.ts || row.ts;
  }

  return [...rows.values()].sort((a, b) => {
    if (a.id === 'main-agent' && b.id !== 'main-agent') return -1;
    if (b.id === 'main-agent' && a.id !== 'main-agent') return 1;
    return new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime();
  });
}

function render(runtimeDir, intervalMs, maxEvents, maxHistory) {
  const projectRoot = path.dirname(path.dirname(runtimeDir));
  const eventsPath = path.join(runtimeDir, 'events.jsonl');
  const transcriptsPath = path.join(runtimeDir, 'transcripts.jsonl');
  const roster = loadAgentRoster(runtimeDir);
  const xp = loadXp(runtimeDir);
  const status = readStatus(projectRoot);
  const events = readJsonLines(eventsPath, maxHistory);
  const transcripts = readJsonLines(transcriptsPath, maxHistory);
  const agents = buildAgentRows(events, transcripts, roster, xp);
  const recentTranscripts = transcripts.slice(-maxEvents).reverse();

  const width = 116;
  const border = `+${'-'.repeat(width - 2)}+`;
  const innerWidth = width - 4;
  const row = (text) => `| ${fit(text, innerWidth)} |`;

  const lines = [
    border,
    row('[KD PIXEL TUI] LIVE OBSERVER'),
    row(`runtime: ${runtimeDir}`),
    row(`refresh: ${intervalMs}ms | next: ${extractNextCommand(status.text)} | quit: q`),
    border,
    row(`[AGENTS] ${agents.length} | main: ${(roster.main && roster.main.name) || 'Main Agent'} | xp: ${xp.xp || 0} | level: ${xp.level || 1}`),
  ];

  if (agents.length === 0) {
    lines.push(row('Waiting for activity...'));
  } else {
    lines.push(row('name                     role                     events   lines    last                ts'));
    for (const agent of agents.slice(0, 12)) {
      const data = `${fit(agent.name, 24)} ${fit(agent.role, 24)} ${fit(String(agent.total_events), 8)} ${fit(String(agent.total_messages), 8)} ${fit(agent.last, 18)} ${fit(fmtTime(agent.ts), 8)}`;
      lines.push(row(data));
    }
  }

  lines.push(border);
  lines.push(row(`[RECENT TRANSCRIPTS] ${recentTranscripts.length}`));

  if (recentTranscripts.length === 0) {
    lines.push(row('No transcript lines yet.'));
  } else {
    for (const line of recentTranscripts) {
      const summary = `${fit(fmtTime(line.ts), 8)} ${fit(line.speaker_name || line.speaker_id || '-', 18)} ${fit(line.command || '-', 18)} ${fit(line.message_kind || '-', 12)} ${fit(line.text || '-', 52)}`;
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
  process.stdout.write(color(DIM, 'Press q to quit. Watching events.jsonl + transcripts.jsonl\n'));
}

async function main() {
  fs = await import('node:fs');
  path = await import('node:path');
  readline = await import('node:readline');

  const args = parseArgs(process.argv.slice(2));
  const intervalMs = toPositiveInt(args.interval, 1000);
  const maxEvents = toPositiveInt(args['max-events'] || args.maxEvents, 10);
  const maxHistory = toPositiveInt(args['max-history'] || args.maxHistory, 250);

  const cwdRuntime = path.join(process.cwd(), '.kracked', 'runtime');
  const scriptDir = path.dirname(process.argv[1] || process.cwd());
  const runtimeDir = fs.existsSync(cwdRuntime) ? cwdRuntime : scriptDir;
  const eventsPath = path.join(runtimeDir, 'events.jsonl');
  const transcriptsPath = path.join(runtimeDir, 'transcripts.jsonl');

  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, '', 'utf8');
  if (!fs.existsSync(transcriptsPath)) fs.writeFileSync(transcriptsPath, '', 'utf8');

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

  render(runtimeDir, intervalMs, maxEvents, maxHistory);
  timer = setInterval(() => render(runtimeDir, intervalMs, maxEvents, maxHistory), intervalMs);
}

main().catch((error) => {
  process.stderr.write(`[KD] pixel-tui error: ${error && error.message ? error.message : String(error)}\n`);
  process.exit(1);
});
