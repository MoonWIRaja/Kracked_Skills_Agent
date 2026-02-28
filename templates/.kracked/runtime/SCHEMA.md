# KD Observer Event Schema

Location: `{project-root}/.kracked/runtime/events.jsonl`
Format: JSON Lines (one valid JSON object per line)

## Required Fields
- `ts` ISO timestamp, example: `"2026-03-01T10:12:33.000Z"`
- `agent_id` stable id, example: `"main-agent"` or `"engineer-agent"`
- `agent_name` display name, example: `"Moon"`
- `role` role label, example: `"Master Agent"`
- `action` one of: `idle`, `reading`, `walking`, `typing`, `waiting`, `celebrate`, `waving`
- `source` adapter/tool name, example: `"antigravity"`, `"codex"`, `"claude-code"`

## Optional Fields
- `target_agent_id` id when delegation happens
- `message` short bubble text
- `task` short task label, example: `"KD-arch"`
- `meta` object for adapter-specific metadata

## Example Line
```json
{"ts":"2026-03-01T10:12:33.000Z","agent_id":"main-agent","agent_name":"Moon","role":"Master Agent","action":"walking","source":"antigravity","target_agent_id":"architect-agent","task":"KD-arch","message":"Delegating architecture design"}
```

## Rules
1. Append only; do not rewrite previous lines.
2. Keep one event per line.
3. Never write comments in `events.jsonl`.
