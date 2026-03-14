# KD Runtime Schemas

## Event Stream
Location: `{project-root}/.kracked/runtime/events.jsonl`

Digunakan untuk activity ringkas observer.

### Required Fields
- `ts`
- `agent_id`
- `agent_name`
- `role`
- `action`
- `source`

### Optional Fields
- `target_agent_id`
- `task`
- `message`
- `meta`

## Transcript Stream
Location: `{project-root}/.kracked/runtime/transcripts.jsonl`

Digunakan untuk dialog sebenar antara main agent, sub-agent, dan hasil scene setiap command.

### Required Fields
- `run_id`
- `ts`
- `command`
- `speaker_id`
- `speaker_name`
- `speaker_role`
- `text`

### Optional Fields
- `stage`
- `event_type`
- `target_id`
- `target_name`
- `message_kind`
- `xp_delta`
- `learning_key`
- `artifact_path`

### Example
```json
{
  "run_id": "run-123",
  "ts": "2026-03-14T10:00:00.000Z",
  "command": "kd-brainstorm",
  "stage": "Brainstorm",
  "event_type": "agent_message",
  "speaker_id": "main-agent",
  "speaker_name": "Moon",
  "speaker_role": "Master Agent",
  "target_id": "ui-ux-frontend-agent",
  "target_name": "Aira",
  "message_kind": "question",
  "text": "Tema visual apa yang paling sesuai untuk aplikasi ini?",
  "xp_delta": 0,
  "learning_key": null,
  "artifact_path": "KD_output/transcripts/20260314-kd-brainstorm.md"
}
```

## Rules
1. Kedua-dua fail adalah append-only.
2. Satu baris mesti satu JSON object yang sah.
3. `events.jsonl` untuk observer activity.
4. `transcripts.jsonl` untuk transcript/comic/chat timeline.
5. Semua `/kd-*` command mesti menulis sekurang-kurangnya satu transcript line.
