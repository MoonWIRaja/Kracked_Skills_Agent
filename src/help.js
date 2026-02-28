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
  console.log(`    ${c('cyan', 'observe')}     Open KD Pixel observer in terminal (TUI)`);
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
  console.log(`    ${c('yellow', '-a, --agent')}     ${c('gray', '<name>')}    Main agent display name (default: Amad)`);
  console.log(`    ${c('yellow', '--panel')}                    Auto-install native Pixel panel after install`);
  console.log(`    ${c('yellow', '--no-panel')}                 Skip native panel auto-install`);
  console.log(`    ${c('yellow', '--interval')}                 Observer refresh interval in ms`);
  console.log(`    ${c('yellow', '--max-events')}               Observer max visible recent events`);
  console.log(`    ${c('yellow', '--max-history')}              Observer max parsed event history`);
  console.log(`    ${c('yellow', '-y, --yes')}                  Non-interactive mode`);
  console.log('');
  showDivider();
  console.log('');
  console.log(c('brightWhite', '  EXAMPLES:'));
  console.log('');
  console.log(`    ${c('gray', '# Interactive install')}`);
  console.log(`    ${c('cyan', 'npx kracked-skills-agent install')}`);
  console.log('');
  console.log(`    ${c('gray', '# Non-interactive (CI/CD)')}`);
  console.log(`    ${c('cyan', 'npx kracked-skills-agent install --yes --language MS --tools codex,cursor --agent Moon')}`);
  console.log('');
  console.log(`    ${c('gray', '# Non-interactive + panel auto-install')}`);
  console.log(`    ${c('cyan', 'npx kracked-skills-agent install --yes --tools cursor --panel')}`);
  console.log('');
  console.log(`    ${c('gray', '# Via GitHub direct')}`);
  console.log(`    ${c('cyan', 'npx github:MoonWIRaja/Kracked_Skills_Agent install')}`);
  console.log('');
  console.log(`    ${c('gray', '# Show stats')}`);
  console.log(`    ${c('cyan', 'npx kracked-skills-agent stats')}`);
  console.log('');
  console.log(`    ${c('gray', '# Open terminal observer (Antigravity-friendly)')}`);
  console.log(`    ${c('cyan', 'npx kracked-skills-agent observe --interval 800 --max-events 15')}`);
  console.log('');
  showDivider();
  console.log('');
  console.log(c('brightWhite', '  SUPPORTED IDE TOOLS:'));
  console.log('');
  console.log(`    ${c('cyan', 'codex')}        â†’ .codex/INSTRUCTIONS.md`);
  console.log(`    ${c('cyan', 'antigravity')}   â†’ .agent/workflows/ + .agents/skills/`);
  console.log(`    ${c('cyan', 'cursor')}        â†’ .cursor/commands/`);
  console.log(`    ${c('cyan', 'opencode')}      â†’ .opencode/agents/`);
  console.log(`    ${c('cyan', 'kilocode')}      â†’ .kilocode/workflows/ + .kilocodemodes`);
  console.log(`    ${c('cyan', 'cline')}         â†’ .clinerules/workflows/`);
  console.log(`    ${c('cyan', 'claude-code')}   â†’ CLAUDE.md + .claude/commands/`);
  console.log('');
}

module.exports = { showHelp };
