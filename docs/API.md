# Kracked_Skills Agent - API Documentation

## Backend REST API

Base URL: `http://localhost:4891/api`

---

### `GET /health`
Health check endpoint.

### `GET /agents`
List all registered agents.

### `GET /agents/:id`
Get single agent by ID.

### `POST /agents/:id/xp`
Add XP to an agent.

**Request Body:**
```json
{
  "amount": 50
}
```

### `GET /projects`
List all projects.

### `POST /projects`
Create a new project.

**Request Body:**
```json
{
  "name": "MyApp",
  "scale": "STANDARD"
}
```

### `GET /memory/:projectId`
Get memory entries for a project.

### `POST /memory`
Store a memory entry.

**Request Body:**
```json
{
  "project_id": "proj-001",
  "key": "tech-stack",
  "value": "Next.js + Node + sql.js",
  "type": "local"
}
```

### `POST /swarm/run` *(Planned)*
Execute a multi-agent swarm task (reserved for future phase).

---

## Observer Event Stream (Local File)

All adapters (codex, antigravity, cursor, opencode, kilocode, cline, claude-code) share one local observer stream:

- `.kracked/runtime/events.jsonl`
- Schema: `.kracked/runtime/SCHEMA.md`
- Emitter: `.kracked/runtime/emit-event.js`

Each line is one JSON object and should be append-only.

---

## Database Schema (SQLite)

### `agents`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Unique agent ID |
| name | TEXT | Agent name |
| role | TEXT | Agent role |
| level | INTEGER | Current level (default: 1) |
| xp | INTEGER | Experience points (default: 0) |

### `projects`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Unique project ID |
| name | TEXT | Project name |
| status | TEXT | Current status (default: 'setup') |
| scale | TEXT | Project scale (default: 'STANDARD') |
| created_at | DATETIME | Creation timestamp |

### `memory`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Unique memory ID |
| project_id | TEXT FK | References projects(id) |
| key | TEXT | Memory key |
| value | TEXT | Memory value |
| type | TEXT | 'local' or 'global' |
