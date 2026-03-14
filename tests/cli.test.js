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
  assert.match(output, /observe/);
  assert.match(output, /observe-web/);
});

test('cli install shows main menu first in interactive mode', () => {
  const output = execFileSync('node', [path.join('bin', 'cli.js'), 'install'], {
    encoding: 'utf8',
    input: '0\n',
  });

  assert.match(output, /MAIN MENU:/);
  assert.match(output, /Install/);
  assert.match(output, /Reinstall \/ Update/);
  assert.match(output, /Uninstall/);
  assert.match(output, /Info/);
  assert.match(output, /Exited without making changes/);
});

test('cli install info menu opens help and returns to menu', () => {
  const output = execFileSync('node', [path.join('bin', 'cli.js'), 'install'], {
    encoding: 'utf8',
    input: '4\n0\n',
  });

  assert.match(output, /MAIN MENU:/);
  assert.match(output, /USAGE:/);
  assert.match(output, /COMMANDS:/);
  assert.match(output, /SUPPORTED IDE TOOLS:/);
});

test('cli install opens package submenu', () => {
  const output = execFileSync('node', [path.join('bin', 'cli.js'), 'install'], {
    encoding: 'utf8',
    input: '1\n',
  });

  assert.match(output, /INSTALL PACKAGE:/);
  assert.match(output, /Kracked Skills/);
  assert.match(output, /Pixel Panel/);
  assert.match(output, /Both/);
});
