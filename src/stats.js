/**
 * Stats Display for Kracked_Skills Agent
 */

const fs = require('fs');
const path = require('path');
const { showXPDisplay, showError, showInfo, c } = require('./display');

async function showStats(args) {
  const targetDir = path.resolve(args.directory || process.cwd());
  const xpFile = path.join(targetDir, '.kracked', 'security', 'xp.json');

  if (!fs.existsSync(xpFile)) {
    showError('KD not installed in this directory. Run install first.');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(xpFile, 'utf8'));
    console.log('');
    showXPDisplay(data);
    console.log('');
  } catch (err) {
    showError(`Failed to read XP data: ${err.message}`);
  }
}

module.exports = { showStats };
