#!/usr/bin/env node

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : 'true';
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

  for (const key of ['command', 'speaker-id', 'speaker-name', 'speaker-role', 'text']) {
    if (!args[key]) fail(`Missing required argument --${key}`);
  }

  const cwdRuntime = path.join(process.cwd(), '.kracked', 'runtime');
  const scriptDir = path.dirname(process.argv[1] || process.cwd());
  const runtimeDir = fs.existsSync(cwdRuntime) ? cwdRuntime : scriptDir;
  const transcriptsPath = path.join(runtimeDir, 'transcripts.jsonl');

  const payload = {
    run_id: args['run-id'] || `${args.command}-${Date.now()}`,
    ts: new Date().toISOString(),
    command: args.command,
    speaker_id: args['speaker-id'],
    speaker_name: args['speaker-name'],
    speaker_role: args['speaker-role'],
    text: args.text,
  };

  if (args.stage) payload.stage = args.stage;
  if (args['event-type']) payload.event_type = args['event-type'];
  if (args['target-id']) payload.target_id = args['target-id'];
  if (args['target-name']) payload.target_name = args['target-name'];
  if (args['message-kind']) payload.message_kind = args['message-kind'];
  if (args['xp-delta']) payload.xp_delta = Number.parseInt(String(args['xp-delta']), 10) || 0;
  if (args['learning-key']) payload.learning_key = args['learning-key'];
  if (args['artifact-path']) payload.artifact_path = args['artifact-path'];

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.appendFileSync(transcriptsPath, `${JSON.stringify(payload)}\n`, 'utf8');
  process.stdout.write('[KD] Transcript appended\n');
}

main().catch((error) => {
  fail(error && error.message ? error.message : String(error));
});
