const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('node:child_process');

const { install } = require('../src/installer');

test('installer creates core KD directories in non-interactive mode', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-install-'));

  try {
    await install({
      directory: tempDir,
      language: 'EN',
      tools: 'codex',
      name: 'TestProject',
      agent: 'Moon',
      yes: true,
    });

    assert.ok(fs.existsSync(path.join(tempDir, '.kracked')));
    assert.ok(fs.existsSync(path.join(tempDir, '.kracked', 'config', 'settings.json')));
    assert.ok(fs.existsSync(path.join(tempDir, '.kracked', 'config', 'main-agent.json')));
    assert.ok(fs.existsSync(path.join(tempDir, '.kracked', 'runtime', 'SCHEMA.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.kracked', 'runtime', 'events.jsonl')));
    assert.ok(fs.existsSync(path.join(tempDir, '.kracked', 'runtime', 'emit-event.js')));
    assert.ok(fs.existsSync(path.join(tempDir, '.kracked', 'runtime', 'pixel-tui.js')));
    assert.ok(fs.existsSync(path.join(tempDir, '.kracked', 'runtime', 'pixel-web.js')));
    assert.ok(fs.existsSync(path.join(tempDir, '.kracked', 'tools', 'vscode-kd-pixel-panel', 'package.json')));
    assert.ok(fs.existsSync(path.join(tempDir, 'kd-panel-install.bat')));
    assert.ok(fs.existsSync(path.join(tempDir, 'kd-panel-install.ps1')));
    assert.ok(fs.existsSync(path.join(tempDir, 'kd-panel-tui.bat')));
    assert.ok(fs.existsSync(path.join(tempDir, 'kd-panel-tui.ps1')));
    assert.ok(fs.existsSync(path.join(tempDir, 'kd-panel-web.bat')));
    assert.ok(fs.existsSync(path.join(tempDir, 'kd-panel-web.ps1')));
    assert.ok(fs.existsSync(path.join(tempDir, 'KD_output', 'status', 'status.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.codex', 'INSTRUCTIONS.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.codex', 'commands', 'kd.md')));

    const settings = JSON.parse(
      fs.readFileSync(path.join(tempDir, '.kracked', 'config', 'settings.json'), 'utf8')
    );
    const agents = JSON.parse(
      fs.readFileSync(path.join(tempDir, '.kracked', 'config', 'agents.json'), 'utf8')
    );
    const xp = JSON.parse(
      fs.readFileSync(path.join(tempDir, '.kracked', 'security', 'xp.json'), 'utf8')
    );
    const codexInstructions = fs.readFileSync(
      path.join(tempDir, '.codex', 'INSTRUCTIONS.md'),
      'utf8'
    );

    execFileSync(
      'node',
      [
        path.join(tempDir, '.kracked', 'runtime', 'emit-event.js'),
        '--source', 'antigravity',
        '--agent-id', 'main-agent',
        '--agent-name', 'Moon',
        '--role', 'Master Agent',
        '--action', 'typing',
        '--task', 'kd-prd',
      ],
      { cwd: tempDir, encoding: 'utf8' }
    );
    const eventsData = fs.readFileSync(path.join(tempDir, '.kracked', 'runtime', 'events.jsonl'), 'utf8');
    const lastLine = eventsData.trim().split('\n').pop();
    const event = JSON.parse(lastLine);

    assert.equal(settings.project.main_agent_name, 'Moon');
    assert.equal(agents.main.name, 'Moon');
    assert.equal(agents.professional.length, 9);
    assert.ok(agents.professional.every((entry) => entry.name && entry.name !== 'Moon'));
    assert.equal(
      new Set(agents.professional.map((entry) => entry.name.toLowerCase())).size,
      agents.professional.length
    );
    assert.equal(xp.agent, 'Moon');
    assert.match(codexInstructions, /Main agent for this installation: Moon/);
    assert.equal(event.source, 'antigravity');
    assert.equal(event.agent_name, 'Moon');
    assert.equal(event.task, 'kd-prd');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('reinstall preserves existing KD_output status, XP, events, and memories', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-reinstall-'));

  try {
    await install({
      directory: tempDir,
      language: 'EN',
      tools: 'codex',
      name: 'PreserveProject',
      agent: 'Moon',
      yes: true,
    });

    const statusPath = path.join(tempDir, 'KD_output', 'status', 'status.md');
    const xpPath = path.join(tempDir, '.kracked', 'security', 'xp.json');
    const eventsPath = path.join(tempDir, '.kracked', 'runtime', 'events.jsonl');
    const memoriesPath = path.join(tempDir, '.kracked', 'skills', 'memories', 'SKILL.md');

    fs.writeFileSync(statusPath, '# Custom Status\nDo not overwrite.', 'utf8');
    fs.writeFileSync(
      xpPath,
      JSON.stringify(
        {
          agent: 'Moon',
          level: 7,
          xp: 2222,
          title: 'Advanced',
          history: [{ action: 'test' }],
          stats: { projects_completed: 9 },
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(eventsPath, '{"source":"antigravity","message":"old-event"}\n', 'utf8');
    fs.writeFileSync(memoriesPath, '# Custom Memory\nPreserve this.', 'utf8');

    await install({
      directory: tempDir,
      language: 'MS',
      tools: 'antigravity,claude',
      name: 'PreserveProject',
      agent: 'Qih',
      yes: true,
    });

    const statusAfter = fs.readFileSync(statusPath, 'utf8');
    const xpAfter = JSON.parse(fs.readFileSync(xpPath, 'utf8'));
    const eventsAfter = fs.readFileSync(eventsPath, 'utf8');
    const memoriesAfter = fs.readFileSync(memoriesPath, 'utf8');

    assert.equal(statusAfter, '# Custom Status\nDo not overwrite.');
    assert.equal(xpAfter.level, 7);
    assert.equal(xpAfter.xp, 2222);
    assert.equal(xpAfter.agent, 'Qih');
    assert.equal(Array.isArray(xpAfter.history), true);
    assert.match(eventsAfter, /old-event/);
    assert.equal(memoriesAfter, '# Custom Memory\nPreserve this.');
    assert.ok(fs.existsSync(path.join(tempDir, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.agent', 'workflows', 'kd.md')));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
