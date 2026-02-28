/**
 * Kracked_Skills Agent — Backend Server
 * Express.js + sql.js (pure JS SQLite — no native build needed)
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

// Middleware
app.use(cors());
app.use(express.json());

let db;

// ── Database Setup ─────────────────────────────────────────
async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
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

  // Seed agents if empty
  const result = db.exec("SELECT COUNT(*) as count FROM agents");
  const count = result[0]?.values[0]?.[0] || 0;

  if (count === 0) {
    const agents = [
      ['amad-001', 'Amad', 'Master Agent', 5, 1240],
      ['ara-001', 'Ara', 'Analyst', 3, 620],
      ['paan-001', 'Paan', 'Product Manager', 3, 580],
      ['adi-001', 'Adi', 'Architect', 4, 900],
      ['teja-001', 'Teja', 'Tech Lead', 3, 710],
      ['ezra-001', 'Ezra', 'Engineer', 4, 1050],
      ['qila-001', 'Qila', 'QA', 2, 340],
      ['sari-001', 'Sari', 'Security', 3, 490],
      ['dian-001', 'Dian', 'DevOps', 2, 280],
      ['rina-001', 'Rina', 'Release Manager', 2, 220],
    ];
    const stmt = db.prepare('INSERT INTO agents (id, name, role, level, xp) VALUES (?, ?, ?, ?, ?)');
    for (const a of agents) {
      stmt.run(a);
    }
    stmt.free();
    console.log('  ✅ Seeded 10 default agents');
  }

  saveDB();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run SELECT query and return array of objects
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

// ── Routes ─────────────────────────────────────────────────

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
  const agents = queryAll('SELECT * FROM agents ORDER BY xp DESC');
  res.json({ agents });
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
  runSQL('INSERT INTO memory (id, project_id, key, value, type) VALUES (?, ?, ?, ?, ?)',
    [id, project_id || null, key, value || '', type || 'local']);
  res.status(201).json({ id, key, type: type || 'local' });
});

// ── Start ──────────────────────────────────────────────────
async function main() {
  await initDB();

  app.listen(PORT, () => {
    console.log(`\n  🚀 Kracked_Skills Agent Backend`);
    console.log(`  📡 http://localhost:${PORT}/api/health`);
    console.log(`  🤖 http://localhost:${PORT}/api/agents\n`);
  });
}

main().catch(err => {
  console.error('❌ Failed to start:', err.message);
  process.exit(1);
});
