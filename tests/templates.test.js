const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('core templates exist', () => {
  const root = path.join(__dirname, '..', 'templates', '.kracked');

  assert.ok(fs.existsSync(path.join(root, 'prompts', 'system-prompt.md')));
  assert.ok(fs.existsSync(path.join(root, 'workflows', 'KD.md')));
  assert.ok(fs.existsSync(path.join(root, 'agents', 'architect.md')));
  assert.ok(fs.existsSync(path.join(root, 'checklists', 'preflight-check.md')));
  assert.ok(fs.existsSync(path.join(root, 'gates', 'validation-block.md')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'SCHEMA.md')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'emit-event.js')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'pixel-tui.js')));
  assert.ok(fs.existsSync(path.join(root, 'runtime', 'pixel-web.js')));
});
