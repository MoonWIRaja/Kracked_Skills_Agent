/**
 * Kracked_Skills Agent - Backend Server
 * Express.js + sql.js (pure JS SQLite)
 * Port: 4891
 */

const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4891;
const DB_PATH = path.join(__dirname, 'kracked.db');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MAIN_AGENT_CONFIG = path.join(PROJECT_ROOT, '.kracked', 'config', 'main-agent.json');
const AGENTS_CONFIG = path.join(PROJECT_ROOT, '.kracked', 'config', 'agents.json');
const XP_CONFIG = path.join(PROJECT_ROOT, '.kracked', 'security', 'xp.json');
const TRANSCRIPTS_PATH = path.join(PROJECT_ROOT, '.kracked', 'runtime', 'transcripts.jsonl');
const STATUS_PATH = path.join(PROJECT_ROOT, 'KD_output', 'status', 'status.md');

const PROFESSIONAL_ROLES = [
  { key: 'analyst', label: 'Analyst', level: 3, xp: 620 },
  { key: 'pm', label: 'Product Manager', level: 3, xp: 580 },
  { key: 'architect', label: 'Architect', level: 4, xp: 900 },
  { key: 'tech-lead', label: 'Tech Lead', level: 3, xp: 710 },
  { key: 'engineer', label: 'Engineer', level: 4, xp: 1050 },
  { key: 'qa', label: 'QA', level: 2, xp: 340 },
  { key: 'security', label: 'Security', level: 3, xp: 490 },
  { key: 'devops', label: 'DevOps', level: 2, xp: 280 },
  { key: 'release-manager', label: 'Release Manager', level: 2, xp: 220 },
  { key: 'ui-ux-frontend', label: 'UI/UX Frontend', level: 3, xp: 540 },
  { key: 'backend-api', label: 'Backend/API', level: 3, xp: 610 },
];

const RANDOM_NAME_POOL = [
  'Denial',
  'Adam',
  'Akmal',
  'Kaizer',
  'Matnep',
  'Aizad',
  'Kito',
  'Iquzo',
  'Naim',
  'Moon',
  'Qih',
  'Hakim',
  'Faris',
  'Iman',
  'Rafli',
  'Iqram',
  'Aiman',
  'Rayyan',
  'Danish',
  'Aqil',
  'Haikal',
  'Anas',
  'Syazwan',
  'Afiq',
  'Haziq',
  'Kiroro',
  'Ashot',
  'Ijam',
  'Pali',
  'Jes',
  'Ly',
  'Natasha',
  'Dakmar',
  'irfan',
  'nizzi',
  'Yamin',
];

app.use(cors());
app.use(express.json());

let db;

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`[KD] Failed to read JSON at ${filePath}: ${error.message}`);
    return null;
  }
}

function readJsonLines(filePath, maxHistory = 200) {
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

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function readStatusSummary() {
  if (!fs.existsSync(STATUS_PATH)) return { text: '', updated_at: null };
  const stat = fs.statSync(STATUS_PATH);
  return {
    text: fs.readFileSync(STATUS_PATH, 'utf8'),
    updated_at: stat.mtime.toISOString(),
  };
}

function extractNextCommand(text) {
  const match = String(text || '').match(/Next command:\s*(\/kd-[\w-]+)/i);
  return match ? match[1] : null;
}

function shuffle(items) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cloned[i];
    cloned[i] = cloned[j];
    cloned[j] = temp;
  }
  return cloned;
}

function pickRandomNames(mainAgentName, count) {
  const used = new Set([String(mainAgentName || '').toLowerCase()]);
  const picked = [];

  for (const candidate of shuffle(RANDOM_NAME_POOL)) {
    const normalized = candidate.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (used.has(key)) continue;

    used.add(key);
    picked.push(normalized);
    if (picked.length === count) break;
  }

  let index = 1;
  while (picked.length < count) {
    const fallback = `Agent${index++}`;
    if (used.has(fallback.toLowerCase())) continue;
    used.add(fallback.toLowerCase());
    picked.push(fallback);
  }

  return picked;
}

function buildRandomProfessionalMap(mainAgentName) {
  const names = pickRandomNames(mainAgentName, PROFESSIONAL_ROLES.length);
  const roleMap = {};
  PROFESSIONAL_ROLES.forEach((role, idx) => {
    roleMap[role.key] = names[idx];
  });
  return roleMap;
}

function normalizeName(value, fallback) {
  const name = String(value || '').trim();
  return name || fallback;
}

function loadSeedRoster() {
  const mainConfig = safeReadJson(MAIN_AGENT_CONFIG);
  const agentsConfig = safeReadJson(AGENTS_CONFIG);
  const xpConfig = safeReadJson(XP_CONFIG);

  const mainName = normalizeName(mainConfig && mainConfig.name, 'Main Agent');
  const professionalMap =
    agentsConfig && agentsConfig.byRole && typeof agentsConfig.byRole === 'object'
      ? agentsConfig.byRole
      : buildRandomProfessionalMap(mainName);

  const mainLevel = Number.isFinite(xpConfig && xpConfig.level) ? xpConfig.level : 5;
  const mainXp = Number.isFinite(xpConfig && xpConfig.xp) ? xpConfig.xp : 1240;

  const roster = [
    {
      id: 'main-agent',
      name: mainName,
      role: 'Master Agent',
      level: mainLevel,
      xp: mainXp,
    },
  ];

  for (const role of PROFESSIONAL_ROLES) {
    roster.push({
      id: `${toSlug(role.key)}-agent`,
      name: normalizeName(professionalMap[role.key], role.label),
      role: role.label,
      level: role.level,
      xp: role.xp,
    });
  }

  return roster;
}

function loadRosterPayload() {
  const mainConfig = safeReadJson(MAIN_AGENT_CONFIG);
  const agentsConfig = safeReadJson(AGENTS_CONFIG);
  const xpConfig = safeReadJson(XP_CONFIG);
  const mainName = normalizeName(mainConfig && mainConfig.name, 'Main Agent');

  const detailsByRole = {};
  const byRole = {};

  for (const role of PROFESSIONAL_ROLES) {
    const details =
      agentsConfig && agentsConfig.detailsByRole && agentsConfig.detailsByRole[role.key]
        ? agentsConfig.detailsByRole[role.key]
        : null;
    const name = normalizeName(
      details && details.name,
      agentsConfig && agentsConfig.byRole ? agentsConfig.byRole[role.key] : role.label
    );
    byRole[role.key] = name;
    detailsByRole[role.key] = {
      id: `${role.key}-agent`,
      role: role.key,
      label: role.label,
      name,
      mention:
        details && typeof details.mention === 'string' && details.mention.trim()
          ? details.mention
          : `@${toSlug(name)}`,
      introduced_at: details && details.introduced_at ? details.introduced_at : null,
    };
  }

  return {
    main: {
      id: 'main-agent',
      name: mainName,
      role: 'Master Agent',
      mention:
        agentsConfig && agentsConfig.main && typeof agentsConfig.main.mention === 'string'
          ? agentsConfig.main.mention
          : '@main-agent',
      level: Number.isFinite(xpConfig && xpConfig.level) ? xpConfig.level : 1,
      xp: Number.isFinite(xpConfig && xpConfig.xp) ? xpConfig.xp : 0,
    },
    byRole,
    detailsByRole,
    professional: Object.values(detailsByRole),
  };
}

function buildProjectSummary() {
  const status = readStatusSummary();
  const transcripts = readJsonLines(TRANSCRIPTS_PATH, 200);
  const latest = transcripts[transcripts.length - 1] || null;
  const xp = safeReadJson(XP_CONFIG) || {};
  const roster = loadRosterPayload();

  return {
    main_agent: roster.main.name,
    current_stage: latest && latest.stage ? latest.stage : null,
    recent_command: latest && latest.command ? latest.command : null,
    next_command: extractNextCommand(status.text),
    level: Number.isFinite(xp.level) ? xp.level : 1,
    xp: Number.isFinite(xp.xp) ? xp.xp : 0,
    status_excerpt: String(status.text || '').trim().slice(0, 320),
    updated_at: (latest && latest.ts) || status.updated_at || new Date().toISOString(),
  };
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function runSQL(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  saveDB();
}

function syncSeedAgents(seedAgents) {
  const existingRows = queryAll('SELECT id FROM agents');
  const existingIds = new Set(existingRows.map((row) => String(row.id)));
  const hasOnlyLegacyIds =
    existingRows.length > 0 &&
    Array.from(existingIds).every((id) => /-001$/i.test(id));

  if (existingRows.length === 0 || hasOnlyLegacyIds) {
    db.run('DELETE FROM agents');

    const seedStmt = db.prepare('INSERT INTO agents (id, name, role, level, xp) VALUES (?, ?, ?, ?, ?)');
    for (const agent of seedAgents) {
      seedStmt.run([agent.id, agent.name, agent.role, agent.level, agent.xp]);
    }
    seedStmt.free();
    saveDB();
    console.log(`[KD] Seeded ${seedAgents.length} agents`);
    return;
  }

  const updateStmt = db.prepare('UPDATE agents SET name = ?, role = ? WHERE id = ?');
  const insertStmt = db.prepare('INSERT INTO agents (id, name, role, level, xp) VALUES (?, ?, ?, ?, ?)');

  for (const agent of seedAgents) {
    if (existingIds.has(agent.id)) {
      updateStmt.run([agent.name, agent.role, agent.id]);
    } else {
      insertStmt.run([agent.id, agent.name, agent.role, agent.level, agent.xp]);
    }
  }

  updateStmt.free();
  insertStmt.free();
  saveDB();
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'setup',
      scale TEXT DEFAULT 'STANDARD',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memory (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      key TEXT NOT NULL,
      value TEXT,
      type TEXT DEFAULT 'local'
    );
  `);

  syncSeedAgents(loadSeedRoster());
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Kracked_Skills_Agent_Backend',
    version: '1.0.0',
    db_connected: db !== null && db !== undefined,
  });
});

// Get all agents
app.get('/api/agents', (req, res) => {
  const agents = queryAll(`
    SELECT * FROM agents
    ORDER BY
      CASE WHEN id = 'main-agent' THEN 0 ELSE 1 END,
      xp DESC
  `);
  res.json({ agents });
});

app.get('/api/roster', (req, res) => {
  res.json(loadRosterPayload());
});

app.get('/api/project-summary', (req, res) => {
  res.json(buildProjectSummary());
});

app.get('/api/transcripts/recent', (req, res) => {
  const parsed = Number.parseInt(String(req.query.limit || '20'), 10);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 200) : 20;
  const transcripts = readJsonLines(TRANSCRIPTS_PATH, 1000).slice(-limit).reverse();
  res.json({ transcripts });
});

app.get('/api/transcripts/:runId', (req, res) => {
  const transcripts = readJsonLines(TRANSCRIPTS_PATH, 2000).filter(
    (line) => String(line.run_id || '') === String(req.params.runId || '')
  );
  if (transcripts.length === 0) {
    return res.status(404).json({ error: 'Transcript not found', run_id: req.params.runId });
  }
  res.json({ run_id: req.params.runId, transcripts });
});

// Get single agent
app.get('/api/agents/:id', (req, res) => {
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id]);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// Add XP to agent
app.post('/api/agents/:id/xp', (req, res) => {
  const { amount } = req.body;
  if (!amount || typeof amount !== 'number') {
    return res.status(400).json({ error: 'amount (number) required' });
  }

  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id]);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const newXp = agent.xp + amount;
  const newLevel = Math.floor(newXp / 200) + 1;
  runSQL('UPDATE agents SET xp = ?, level = ? WHERE id = ?', [newXp, newLevel, req.params.id]);
  res.json({ id: req.params.id, xp: newXp, level: newLevel, added: amount });
});

// List projects
app.get('/api/projects', (req, res) => {
  const projects = queryAll('SELECT * FROM projects ORDER BY created_at DESC');
  res.json({ projects });
});

// Create project
app.post('/api/projects', (req, res) => {
  const { name, scale } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = uuidv4();
  runSQL('INSERT INTO projects (id, name, scale) VALUES (?, ?, ?)', [id, name, scale || 'STANDARD']);
  res.status(201).json({ id, name, scale: scale || 'STANDARD', status: 'setup' });
});

// Get memory
app.get('/api/memory/:projectId', (req, res) => {
  const memories = queryAll('SELECT * FROM memory WHERE project_id = ?', [req.params.projectId]);
  res.json({ memories });
});

// Store memory
app.post('/api/memory', (req, res) => {
  const { project_id, key, value, type } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });

  const id = uuidv4();
  runSQL('INSERT INTO memory (id, project_id, key, value, type) VALUES (?, ?, ?, ?, ?)', [
    id,
    project_id || null,
    key,
    value || '',
    type || 'local',
  ]);
  res.status(201).json({ id, key, type: type || 'local' });
});

async function main() {
  await initDB();

  app.listen(PORT, () => {
    console.log('\n  [KD] Backend started');
    console.log(`  [KD] Health: http://localhost:${PORT}/api/health`);
    console.log(`  [KD] Agents: http://localhost:${PORT}/api/agents\n`);
  });
}

main().catch((err) => {
  console.error('[KD] Failed to start:', err.message);
  process.exit(1);
});
