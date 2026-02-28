/**
 * Updater for Kracked_Skills Agent
 */

const fs = require('fs');
const path = require('path');
const { showStep, showSuccess, showError, showInfo, c } = require('./display');

async function update(args) {
  const targetDir = path.resolve(args.directory || process.cwd());
  const krackDir = path.join(targetDir, '.kracked');

  if (!fs.existsSync(krackDir)) {
    showError('KD not installed in this directory. Run install first.');
    return;
  }

  showInfo('Updating Kracked_Skills Agent...');

  // Read current manifest
  const manifestPath = path.join(krackDir, '_config', 'manifest.yaml');
  if (fs.existsSync(manifestPath)) {
    showSuccess('Found existing installation');
  }

  // Re-run install with overwrite
  args.yes = true;
  const { install } = require('./installer');
  await install(args);

  showSuccess('Update complete!');
}

module.exports = { update };
