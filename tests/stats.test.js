const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { showStats } = require('../src/stats');

test('showStats reads xp file without throwing', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-stats-'));
  const xpDir = path.join(tempDir, '.kracked', 'security');
  fs.mkdirSync(xpDir, { recursive: true });

  const xp = {
    agent: 'Amad',
    level: 1,
    xp: 0,
    stats: {
      projects_completed: 0,
      prd_written: 0,
      security_fixes: 0,
      stories_implemented: 0,
      domains_explored: 0,
    },
  };

  fs.writeFileSync(path.join(xpDir, 'xp.json'), JSON.stringify(xp, null, 2), 'utf8');

  try {
    await showStats({ directory: tempDir });
    assert.ok(true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
