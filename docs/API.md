# Kracked_Skills Agent — API Documentation

## Backend REST API

Base URL: `http://localhost:8080/api`

---

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "Kracked_Skills_Agent_Backend",
  "version": "1.0.0",
  "db_connected": true
}
```

---

### `GET /agents`
List all registered agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "amad-001",
      "name": "Amad",
      "role": "Master Agent",
      "level": 5,
      "xp": 1240
    }
  ]
}
```

---

### `POST /agents` *(Planned)*
Register a new agent.

**Request Body:**
```json
{
  "name": "CustomAgent",
  "role": "Specialist",
  "palette": 3
}
```

---

### `GET /projects` *(Planned)*
List all projects.

---

### `POST /projects` *(Planned)*
Create a new project.

**Request Body:**
```json
{
  "name": "MyApp",
  "scale": "STANDARD"
}
```

---

### `GET /memory/:projectId` *(Planned)*
Get memory entries for a project.

---

### `POST /memory` *(Planned)*
Store a memory entry.

**Request Body:**
```json
{
  "project_id": "proj-001",
  "key": "tech-stack",
  "value": "Next.js + Go + SQLite",
  "type": "local"
}
```

---

### `POST /swarm/run` *(Planned)*
Execute a multi-agent swarm task.

**Request Body:**
```json
{
  "agents": ["amad", "ara", "sari"],
  "task": "Analyze security vulnerabilities in auth module",
  "mode": "party"
}
```

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
