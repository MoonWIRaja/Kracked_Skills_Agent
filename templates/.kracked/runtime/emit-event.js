#!/usr/bin/env node

/**
 * KD Observer Event Emitter
 * Appends one JSON line event to .kracked/runtime/events.jsonl
 */

const fs = require('fs');
const path = require('path');

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

function resolveRuntimeDir() {
  const cwdRuntime = path.join(process.cwd(), '.kracked', 'runtime');
  if (fs.existsSync(cwdRuntime)) return cwdRuntime;
  return __dirname;
}

function fail(message) {
  process.stderr.write(`[KD] ${message}\n`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const required = ['source', 'agent-id', 'agent-name', 'role', 'action'];
  for (const key of required) {
    if (!args[key]) {
      fail(`Missing required argument --${key}`);
    }
  }

  const runtimeDir = resolveRuntimeDir();
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

main();
