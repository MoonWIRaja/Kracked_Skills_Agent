/**
 * Uninstaller for Kracked_Skills Agent
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { showSuccess, showError, showWarning, c } = require('./display');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function removeDirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
}

async function uninstall(args) {
  const targetDir = path.resolve(args.directory || process.cwd());
  const krackDir = path.join(targetDir, '.kracked');

  if (!fs.existsSync(krackDir)) {
    showError('KD not installed in this directory.');
    return;
  }

  if (!args.yes) {
    showWarning('This will remove ALL KD files from this project.');
    const answer = await prompt(`  ${c('red', '⚠️')}  Are you sure? (type YES to confirm): `);
    if (answer !== 'YES') {
      console.log('  Uninstall cancelled.');
      return;
    }
  }

  // Remove KD directories
  const dirsToRemove = [
    '.kracked',
    'KD_output',
    // Adapter dirs (only remove KD-specific files, not entire folders)
  ];

  dirsToRemove.forEach(dir => {
    const fullPath = path.join(targetDir, dir);
    if (fs.existsSync(fullPath)) {
      removeDirRecursive(fullPath);
      showSuccess(`Removed ${dir}/`);
    }
  });

  // Remove adapter files
  const adapterPaths = [
    '.codex/INSTRUCTIONS.md',
    '.kilocodemodes',
  ];

  adapterPaths.forEach(f => {
    const fullPath = path.join(targetDir, f);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      showSuccess(`Removed ${f}`);
    }
  });

  // Remove adapter workflow/command dirs (KD-specific files only)
  const adapterDirs = [
    { dir: '.agent/workflows', prefix: 'kd' },
    { dir: '.agents/skills/kracked-skills-agent', prefix: '' },
    { dir: '.cursor/commands', prefix: 'kd' },
    { dir: '.opencode/agents', prefix: 'kracked' },
    { dir: '.kilocode/workflows', prefix: 'kd' },
    { dir: '.clinerules/workflows', prefix: 'kd' },
  ];

  adapterDirs.forEach(({ dir, prefix }) => {
    const fullDir = path.join(targetDir, dir);
    if (fs.existsSync(fullDir)) {
      if (prefix === '') {
        // Remove entire subdirectory
        removeDirRecursive(fullDir);
        showSuccess(`Removed ${dir}/`);
      } else {
        // Remove only KD files
        const files = fs.readdirSync(fullDir);
        files.forEach(f => {
          if (f.startsWith(prefix)) {
            fs.unlinkSync(path.join(fullDir, f));
          }
        });
        showSuccess(`Cleaned ${dir}/`);
      }
    }
  });

  console.log('');
  showSuccess('Kracked_Skills Agent uninstalled successfully.');
  console.log('');
}

module.exports = { uninstall };
