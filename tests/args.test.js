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

test('parseArgs supports observer tuning flags', () => {
  const args = parseArgs(['observe', '--interval', '800', '--max-events', '15', '--max-history', '300', '--port', '4900']);

  assert.equal(args.command, 'observe');
  assert.equal(args.interval, '800');
  assert.equal(args.maxEvents, '15');
  assert.equal(args.maxHistory, '300');
  assert.equal(args.port, '4900');
});
