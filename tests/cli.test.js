const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('path');

test('cli help command prints usage', () => {
  const output = execFileSync('node', [path.join('bin', 'cli.js'), 'help'], {
    encoding: 'utf8',
  });

  assert.match(output, /USAGE:/);
  assert.match(output, /COMMANDS:/);
});
