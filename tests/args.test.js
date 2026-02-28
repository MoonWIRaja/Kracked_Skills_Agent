const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs } = require('../bin/args');

test('parseArgs supports --panel and --no-panel flags', () => {
  const withPanel = parseArgs(['install', '--panel']);
  const withoutPanel = parseArgs(['install', '--no-panel']);

  assert.equal(withPanel.panel, true);
  assert.equal(withoutPanel.panel, false);
});

test('parseArgs supports --panel with explicit boolean-like value', () => {
  const yesValue = parseArgs(['install', '--panel', 'yes']);
  const noValue = parseArgs(['install', '--panel', 'no']);

  assert.equal(yesValue.panel, true);
  assert.equal(noValue.panel, false);
});
