#!/usr/bin/env node

/**
 * Kracked_Skills Agent (KD) — CLI Entry Point
 * Usage:
 *   npx kracked-skills-agent install          # Interactive install
 *   npx kracked-skills-agent install --yes    # Non-interactive
 *   npx kracked-skills-agent update           # Update existing installation
 *   npx kracked-skills-agent uninstall        # Remove KD from project
 *   npx kracked-skills-agent stats            # Show XP & level stats
 *   npx kracked-skills-agent observe          # Open terminal Pixel observer (TUI)
 *   npx kracked-skills-agent observe-web      # Open web Pixel observer mirror
 *   npx kracked-skills-agent help             # Show help
 */

const { parseArgs } = require('./args');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { install, installPixelPanelOnly } = require('../src/installer');
const { update } = require('../src/updater');
const { uninstall } = require('../src/uninstaller');
const { showStats } = require('../src/stats');
const { runObserver, runObserverWeb } = require('../src/observer');
const { showHelp } = require('../src/help');
const { showBanner, c, showDivider, showInfo, showWarning } = require('../src/display');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function hasExistingInstallation(targetDir) {
  const resolved = path.resolve(targetDir || process.cwd());
  return fs.existsSync(path.join(resolved, '.kracked'));
}

async function chooseInteractiveAction(args) {
  const installed = hasExistingInstallation(args.directory);

  while (true) {
    console.log(`  ${c('brightWhite', 'MAIN MENU:')}`);
    console.log('');
    console.log(`    ${c('cyan', '1.')} Install`);
    console.log(`    ${c('cyan', '2.')} Reinstall / Update`);
    console.log(`    ${c('cyan', '3.')} Uninstall`);
    console.log(`    ${c('cyan', '4.')} Info`);
    console.log(`    ${c('cyan', '0.')} Exit`);
    console.log('');
    showDivider();
    console.log('');
    if (installed) {
      showInfo(`Existing KD installation detected in ${path.resolve(args.directory || process.cwd())}`);
    } else {
      showWarning(`No KD installation detected yet in ${path.resolve(args.directory || process.cwd())}`);
    }
    console.log('');

    const answer = await prompt(`  ${c('brightGreen', '->')} Choose [1/2/3/4/0]: `);
    const normalized = String(answer || '').trim().toLowerCase();

    if (normalized === '1' || normalized === 'install') return 'install';
    if (normalized === '2' || normalized === 'reinstall' || normalized === 'update') return 'update';
    if (normalized === '3' || normalized === 'uninstall') return 'uninstall';
    if (normalized === '4' || normalized === 'info' || normalized === 'help') {
      console.log('');
      showHelp();
      console.log('');
      continue;
    }
    if (normalized === '0' || normalized === 'exit' || normalized === 'quit' || normalized === 'q') {
      return 'exit';
    }

    showWarning('Invalid menu choice. Please choose 1, 2, 3, 4, or 0.');
    console.log('');
  }
}

async function chooseInstallPackage() {
  while (true) {
    console.log(`  ${c('brightWhite', 'INSTALL PACKAGE:')}`);
    console.log('');
    console.log(`    ${c('cyan', '1.')} Kracked Skills`);
    console.log(`    ${c('cyan', '2.')} Pixel Panel`);
    console.log(`    ${c('cyan', '3.')} Both`);
    console.log(`    ${c('cyan', '0.')} Back`);
    console.log('');

    const answer = await prompt(`  ${c('brightGreen', '->')} Choose [1/2/3/0]: `);
    const normalized = String(answer || '').trim().toLowerCase();

    if (normalized === '1' || normalized === 'kracked skills' || normalized === 'skills') return 'skills';
    if (normalized === '2' || normalized === 'pixel panel' || normalized === 'panel') return 'panel';
    if (normalized === '3' || normalized === 'both' || normalized === 'kedua' || normalized === 'kedua ii') return 'both';
    if (normalized === '0' || normalized === 'back' || normalized === 'b') return 'back';

    showWarning('Invalid package choice. Please choose 1, 2, 3, or 0.');
    console.log('');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Show banner
  showBanner();

  if ((!args.command || args.command === 'install') && !args.yes) {
    while (true) {
      const selected = await chooseInteractiveAction(args);
      if (selected === 'exit') {
        showInfo('Exited without making changes.');
        return;
      }

      if (selected === 'install') {
        const installPackage = await chooseInstallPackage();
        if (installPackage === 'back') continue;

        if (installPackage === 'skills') {
          args.panel = false;
          args.command = 'install';
        } else if (installPackage === 'panel') {
          args.command = 'panel-install';
        } else {
          args.panel = true;
          args.command = 'install';
        }
        break;
      }

      args.command = selected;
      break;
    }
  }

  switch (args.command) {
    case 'install':
      await install(args);
      break;

    case 'update':
      await update(args);
      break;

    case 'panel-install':
      await installPixelPanelOnly(args);
      break;

    case 'uninstall':
      await uninstall(args);
      break;

    case 'stats':
      await showStats(args);
      break;

    case 'observe':
    case 'panel-tui':
      await runObserver(args);
      break;

    case 'observe-web':
    case 'panel-web':
      await runObserverWeb(args);
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case 'version':
    case '--version':
    case '-v':
      const pkg = require('../package.json');
      console.log(`kracked-skills-agent v${pkg.version}`);
      break;

    default:
      if (!args.command) {
        // No command = default to install
        await install(args);
      } else {
        console.log(`\n  ❌ Unknown command: "${args.command}"\n`);
        showHelp();
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error('\n  ❌ Error:', err.message);
  process.exit(1);
});
