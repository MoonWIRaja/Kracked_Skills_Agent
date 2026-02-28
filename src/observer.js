/**
 * Terminal observer runner for KD Pixel TUI.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('node:child_process');
const { showError, showInfo, showWarning } = require('./display');

async function runObserver(args) {
  const targetDir = path.resolve(args.directory || process.cwd());
  const scriptPath = path.join(targetDir, '.kracked', 'runtime', 'pixel-tui.js');

  if (!fs.existsSync(scriptPath)) {
    showError('Pixel TUI runtime not found. Re-run install in this project first.');
    return;
  }

  const scriptArgs = [];
  if (args.interval) {
    scriptArgs.push('--interval', String(args.interval));
  }
  if (args.maxEvents) {
    scriptArgs.push('--max-events', String(args.maxEvents));
  }
  if (args.maxHistory) {
    scriptArgs.push('--max-history', String(args.maxHistory));
  }

  showInfo('Starting KD Pixel TUI observer...');
  showInfo('Press q to quit.');

  await new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...scriptArgs], {
      cwd: targetDir,
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      showError(`Failed to start Pixel TUI: ${err.message}`);
      resolve();
    });

    child.on('exit', (code) => {
      if (code && code !== 0) {
        showWarning(`Pixel TUI exited with code ${code}`);
      }
      resolve();
    });
  });
}

module.exports = { runObserver };
