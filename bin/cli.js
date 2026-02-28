#!/usr/bin/env node

/**
 * Kracked_Skills Agent (KD) — CLI Entry Point
 * Usage:
 *   npx kracked-skills-agent install          # Interactive install
 *   npx kracked-skills-agent install --yes    # Non-interactive
 *   npx kracked-skills-agent update           # Update existing installation
 *   npx kracked-skills-agent uninstall        # Remove KD from project
 *   npx kracked-skills-agent stats            # Show XP & level stats
 *   npx kracked-skills-agent help             # Show help
 */

const { parseArgs } = require('./args');
const { install } = require('../src/installer');
const { update } = require('../src/updater');
const { uninstall } = require('../src/uninstaller');
const { showStats } = require('../src/stats');
const { showHelp } = require('../src/help');
const { showBanner } = require('../src/display');

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Show banner
  showBanner();

  switch (args.command) {
    case 'install':
      await install(args);
      break;

    case 'update':
      await update(args);
      break;

    case 'uninstall':
      await uninstall(args);
      break;

    case 'stats':
      await showStats(args);
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
