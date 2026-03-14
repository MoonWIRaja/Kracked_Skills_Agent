const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('core templates exist', () => {
  const root = path.join(__dirname, '..', 'templates', '.kracked');

  assert.ok(fs.existsSync(path.join(root, 'prompts', 'system-prompt.md')));
  assert.ok(fs.existsSync(path.join(root, 'workflows', 'KD.md')));
  assert.ok(fs.existsSync(path.join(root, 'agents', 'architect.md')));
  assert.ok(fs.existsSync(path.join(root, 'agents', 'ui-ux-frontend.md')));
  assert.ok(fs.existsSync(path.join(root, 'agents', 'backend-api.md')));
  assert.ok(fs.existsSync(path.join(root, 'checklists', 'preflight-check.md')));
  assert.ok(fs.existsSync(path.join(root, 'checklists', 'code-review-checklist.md')));
  assert.ok(fs.existsSync(path.join(root, 'gates', 'validation-block.md')));
  assert.ok(fs.existsSync(path.join(root, 'gates', 'architecture-gate.md')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'SCHEMA.md')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'emit-event.js')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'emit-transcript.js')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'pixel-tui.js')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'pixel-web.js')));
  assert.ok(fs.existsSync(path.join(root, 'workflows', 'KD-roster.md')));
  assert.ok(fs.existsSync(path.join(root, 'skills', 'agent-dialogue', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, 'skills', 'project-reverse-analysis', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, 'skills', 'brainstorm-interview', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, 'skills', 'learning-xp', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, 'skills', 'ui-ux-frontend', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, 'skills', 'backend-api', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, 'templates', 'brainstorm.md')));
  assert.ok(fs.existsSync(path.join(root, 'templates', 'deployment-plan.md')));
});
