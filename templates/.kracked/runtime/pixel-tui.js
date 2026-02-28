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

function render(eventsPath, intervalMs, maxEvents, maxHistory) {
  const events = readEvents(eventsPath, maxHistory);
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

  render(eventsPath, intervalMs, maxEvents, maxHistory);
  timer = setInterval(() => {
    render(eventsPath, intervalMs, maxEvents, maxHistory);
  }, intervalMs);
}

main().catch((err) => {
  process.stderr.write(`[KD] pixel-tui error: ${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
});
