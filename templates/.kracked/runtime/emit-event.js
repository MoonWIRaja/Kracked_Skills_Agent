#!/usr/bin/env node

/**
 * KD Observer Event Emitter
 * Works in both CommonJS projects and ESM projects (type: module).
 */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    out[key] = value;
  }
  return out;
}

function fail(message) {
  process.stderr.write(`[KD] ${message}\n`);
  process.exit(1);
}

async function main() {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const args = parseArgs(process.argv.slice(2));

  for (const key of ['source', 'agent-id', 'agent-name', 'role', 'action']) {
    if (!args[key]) fail(`Missing required argument --${key}`);
  }

  const cwdRuntime = path.join(process.cwd(), '.kracked', 'runtime');
  const scriptDir = path.dirname(process.argv[1] || process.cwd());
  const runtimeDir = fs.existsSync(cwdRuntime) ? cwdRuntime : scriptDir;
  const eventsPath = path.join(runtimeDir, 'events.jsonl');

  const event = {
    ts: new Date().toISOString(),
    agent_id: args['agent-id'],
    agent_name: args['agent-name'],
    role: args.role,
    action: args.action,
    source: args.source,
  };

  if (args['target-agent-id']) event.target_agent_id = args['target-agent-id'];
  if (args.task) event.task = args.task;
  if (args.message) event.message = args.message;

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.appendFileSync(eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
  process.stdout.write('[KD] Event appended\n');
}

main().catch((err) => {
  fail(err && err.message ? err.message : String(err));
});
