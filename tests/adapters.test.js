const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { generateAdapter } = require('../src/adapters');

test('antigravity adapter creates workflow files and skill directory', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-adapter-'));

  try {
    const files = generateAdapter(tempDir, 'antigravity');

    assert.ok(Array.isArray(files));
    assert.ok(files.length > 0);
    assert.ok(fs.existsSync(path.join(tempDir, '.agent', 'workflows', 'kd.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.agent', 'workflows', 'kd-roster.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.agents', 'skills', 'kracked-skills-agent', 'SKILL.md')));

    const workflow = fs.readFileSync(path.join(tempDir, '.agent', 'workflows', 'kd.md'), 'utf8');
    const rosterWorkflow = fs.readFileSync(path.join(tempDir, '.agent', 'workflows', 'kd-roster.md'), 'utf8');
    const skill = fs.readFileSync(
      path.join(tempDir, '.agents', 'skills', 'kracked-skills-agent', 'SKILL.md'),
      'utf8'
    );
    assert.match(workflow, /runtime\/SCHEMA\.md/);
    assert.match(workflow, /runtime\/emit-event\.js/);
    assert.match(workflow, /runtime\/emit-transcript\.js/);
    assert.match(workflow, /config\/agents\.json/);
    assert.match(workflow, /config\/settings\.json/);
    assert.match(workflow, /planning, chat, explanations, summaries, transcripts, and document prose MUST use the language chosen in settings\.json/);
    assert.match(rosterWorkflow, /KD-roster\.md/);
    assert.match(skill, /11 specialized sub-agent roles/);
    assert.match(skill, /transcripts\.jsonl/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('codex adapter creates instructions and command files', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-codex-'));

  try {
    const files = generateAdapter(tempDir, 'codex', {
      mainAgentName: 'Moon',
      roster: {
        byRole: {
          analyst: 'Matnep',
        },
      },
    });

    assert.ok(Array.isArray(files));
    assert.ok(files.length > 1);
    assert.ok(fs.existsSync(path.join(tempDir, '.codex', 'INSTRUCTIONS.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.codex', 'commands', 'kd.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.codex', 'commands', 'kd-help.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.codex', 'commands', 'kd-roster.md')));

    const instructions = fs.readFileSync(path.join(tempDir, '.codex', 'INSTRUCTIONS.md'), 'utf8');
    const commandMarkdown = fs.readFileSync(path.join(tempDir, '.codex', 'commands', 'kd.md'), 'utf8');
    assert.match(instructions, /Main agent for this installation: Moon/);
    assert.match(instructions, /Agent roster: \{project-root\}\/\.kracked\/config\/agents\.json/);
    assert.match(instructions, /Settings: \{project-root\}\/\.kracked\/config\/settings\.json/);
    assert.match(commandMarkdown, /runtime\/SCHEMA\.md/);
    assert.match(commandMarkdown, /runtime\/emit-event\.js/);
    assert.match(commandMarkdown, /runtime\/emit-transcript\.js/);
    assert.match(commandMarkdown, /config\/agents\.json/);
    assert.match(commandMarkdown, /config\/settings\.json/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('kilocode adapter uses dynamic main agent slug and name', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-kilo-'));

  try {
    generateAdapter(tempDir, 'kilocode', { mainAgentName: 'Moon Qih' });
    const modes = fs.readFileSync(path.join(tempDir, '.kilocodemodes'), 'utf8');

    assert.match(modes, /slug: kd-agent-moon-qih/);
    assert.match(modes, /KD Agent Moon Qih/);
    assert.match(modes, /You are Moon Qih/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('claude-code adapter creates CLAUDE.md and command files', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-claude-'));

  try {
    const files = generateAdapter(tempDir, 'claude-code', { mainAgentName: 'Moon' });

    assert.ok(Array.isArray(files));
    assert.ok(files.length > 1);
    assert.ok(fs.existsSync(path.join(tempDir, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(tempDir, '.claude', 'commands', 'kd.md')));

    const claude = fs.readFileSync(path.join(tempDir, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /Main agent for this installation: Moon/);
    assert.match(claude, /Agent roster: \{project-root\}\/\.kracked\/config\/agents\.json/);
    assert.match(claude, /Settings: \{project-root\}\/\.kracked\/config\/settings\.json/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
