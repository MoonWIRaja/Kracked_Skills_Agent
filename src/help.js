/**
 * Help Display for Kracked_Skills Agent
 */

const { c, showDivider } = require('./display');

function showHelp() {
  console.log(c('brightWhite', '  USAGE:'));
  console.log('');
  console.log(`    ${c('cyan', 'npx kracked-skills-agent')} ${c('yellow', '<command>')} ${c('gray', '[options]')}`);
  console.log('');
  showDivider();
  console.log('');
  console.log(c('brightWhite', '  COMMANDS:'));
  console.log('');
  console.log(`    ${c('cyan', 'install')}     Install KD into current project (default)`);
  console.log(`    ${c('cyan', 'update')}      Update existing KD installation`);
  console.log(`    ${c('cyan', 'uninstall')}   Remove KD from project`);
  console.log(`    ${c('cyan', 'stats')}       Show XP, level, and agent stats`);
  console.log(`    ${c('cyan', 'help')}        Show this help message`);
  console.log(`    ${c('cyan', 'version')}     Show version`);
  console.log('');
  showDivider();
  console.log('');
  console.log(c('brightWhite', '  OPTIONS:'));
  console.log('');
  console.log(`    ${c('yellow', '-d, --directory')} ${c('gray', '<path>')}    Target directory (default: current)`);
  console.log(`    ${c('yellow', '-l, --language')}  ${c('gray', '<lang>')}    Language: EN, MS, or custom`);
  console.log(`    ${c('yellow', '-t, --tools')}     ${c('gray', '<list>')}    IDE tools (comma-separated)`);
  console.log(`    ${c('yellow', '-n, --name')}      ${c('gray', '<name>')}    Project name`);
  console.log(`    ${c('yellow', '-y, --yes')}                  Non-interactive mode`);
  console.log(`    ${c('yellow', '-g, --global')}               Install globally (~/.kracked/)`);
  console.log('');
  showDivider();
  console.log('');
  console.log(c('brightWhite', '  EXAMPLES:'));
  console.log('');
  console.log(`    ${c('gray', '# Interactive install')}`);
  console.log(`    ${c('cyan', 'npx kracked-skills-agent install')}`);
  console.log('');
  console.log(`    ${c('gray', '# Non-interactive (CI/CD)')}`);
  console.log(`    ${c('cyan', 'npx kracked-skills-agent install --yes --language MS --tools codex,cursor')}`);
  console.log('');
  console.log(`    ${c('gray', '# Via GitHub direct')}`);
  console.log(`    ${c('cyan', 'npx github:MoonWIRaja/Kracked_Skills_Agent install')}`);
  console.log('');
  console.log(`    ${c('gray', '# Show stats')}`);
  console.log(`    ${c('cyan', 'npx kracked-skills-agent stats')}`);
  console.log('');
  showDivider();
  console.log('');
  console.log(c('brightWhite', '  SUPPORTED IDE TOOLS:'));
  console.log('');
  console.log(`    ${c('cyan', 'codex')}        → .codex/INSTRUCTIONS.md`);
  console.log(`    ${c('cyan', 'antigravity')}   → .agent/workflows/ + .agents/skills/`);
  console.log(`    ${c('cyan', 'cursor')}        → .cursor/commands/`);
  console.log(`    ${c('cyan', 'opencode')}      → .opencode/agents/`);
  console.log(`    ${c('cyan', 'kilocode')}      → .kilocode/workflows/ + .kilocodemodes`);
  console.log(`    ${c('cyan', 'cline')}         → .clinerules/workflows/`);
  console.log('');
}

module.exports = { showHelp };
