/**
 * Display Utilities for Kracked_Skills Agent CLI
 * TUI colors, boxes, progress bars, banners
 */

// ANSI Color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

function c(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function showBanner() {
  console.log('');
  console.log(c('brightCyan', '  ╔═══════════════════════════════════════════════════╗'));
  console.log(c('brightCyan', '  ║') + c('brightYellow', '   ⚡ KRACKED_SKILLS AGENT (KD)                   ') + c('brightCyan', '║'));
  console.log(c('brightCyan', '  ║') + c('white',        '   AI Multi-Agent System for Dev Professionals     ') + c('brightCyan', '║'));
  console.log(c('brightCyan', '  ║') + c('gray',         '   by KRACKEDDEVS — KD finishes what it starts.    ') + c('brightCyan', '║'));
  console.log(c('brightCyan', '  ╚═══════════════════════════════════════════════════╝'));
  console.log('');
}

function showSuccess(message) {
  console.log(`  ${c('green', '✅')} ${message}`);
}

function showError(message) {
  console.log(`  ${c('red', '❌')} ${message}`);
}

function showWarning(message) {
  console.log(`  ${c('yellow', '⚠️')}  ${message}`);
}

function showInfo(message) {
  console.log(`  ${c('cyan', 'ℹ️')}  ${message}`);
}

function showStep(step, total, message) {
  const progress = `[${step}/${total}]`;
  console.log(`  ${c('brightMagenta', progress)} ${message}`);
}

function showProgressBar(current, total, label = '') {
  const width = 30;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round((current / total) * 100);
  console.log(`  ${c('cyan', bar)} ${c('white', `${percent}%`)} ${c('gray', label)}`);
}

function showBox(title, lines) {
  const maxLen = Math.max(title.length, ...lines.map(l => stripAnsi(l).length));
  const width = maxLen + 4;
  const pad = (str) => {
    const plainLen = stripAnsi(str).length;
    return str + ' '.repeat(Math.max(0, width - 2 - plainLen));
  };

  console.log(`  ${c('cyan', '┌' + '─'.repeat(width) + '┐')}`);
  console.log(`  ${c('cyan', '│')} ${c('bold', pad(title))}${c('cyan', '│')}`);
  console.log(`  ${c('cyan', '├' + '─'.repeat(width) + '┤')}`);
  lines.forEach(line => {
    console.log(`  ${c('cyan', '│')} ${pad(line)}${c('cyan', '│')}`);
  });
  console.log(`  ${c('cyan', '└' + '─'.repeat(width) + '┘')}`);
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function showDivider() {
  console.log(c('gray', '  ─────────────────────────────────────────────'));
}

function showXPDisplay(data) {
  const levelTitles = {
    1: 'Novice',
    2: 'Apprentice',
    3: 'Practitioner',
    4: 'Expert',
    5: 'Master',
    6: 'Grandmaster',
  };

  const levelThresholds = [0, 300, 900, 2000, 4000, 8000, Infinity];

  const level = data.level || 1;
  const xp = data.xp || 0;
  const nextLevelXP = levelThresholds[level] || 300;
  const title = levelTitles[level] || 'Novice';

  showBox(`AGEN: ${data.agent || 'AMAD'}`, [
    `Level ${level} — ${title}`,
    `XP: ${xp} / ${nextLevelXP}`,
    '',
    `${c('gray', 'Stats:')}`,
    `  ✦ Projek Selesai:    ${data.stats?.projects_completed || 0}`,
    `  ✦ PRD Ditulis:       ${data.stats?.prd_written || 0}`,
    `  ✦ Isu Sec. Betul:    ${data.stats?.security_fixes || 0}`,
    `  ✦ Stories Implement: ${data.stats?.stories_implemented || 0}`,
    `  ✦ Domain Baharu:     ${data.stats?.domains_explored || 0}`,
  ]);
}

module.exports = {
  colors,
  c,
  showBanner,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showStep,
  showProgressBar,
  showBox,
  showDivider,
  showXPDisplay,
  stripAnsi,
};
