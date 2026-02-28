/**
 * Display utilities for Kracked_Skills Agent CLI.
 * Theme: cyberpunk green terminal.
 */

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  bgBlack: '\x1b[40m',
};

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;

function c(color, text) {
  if (!supportsColor || !colors[color]) return String(text);
  return `${colors[color]}${text}${colors.reset}`;
}

function stripAnsi(str) {
  return String(str).replace(/\x1b\[[0-9;]*m/g, '');
}

function showBanner() {
  const frame = '  +---------------------------------------------------------+';
  console.log('');
  console.log(c('brightGreen', frame));
  console.log(c('brightGreen', '  |') + c('brightGreen', '  KRACKED_SKILLS AGENT (KD)                                ') + c('brightGreen', '|'));
  console.log(c('brightGreen', '  |') + c('green',       '  AI Multi-Agent System for Dev Professionals              ') + c('brightGreen', '|'));
  console.log(c('brightGreen', '  |') + c('gray',        '  CYBERPUNK MODE ENABLED - KD FINISHES WHAT IT STARTS     ') + c('brightGreen', '|'));
  console.log(c('brightGreen', frame));
  console.log('');
}

function showSuccess(message) {
  console.log(`  ${c('brightGreen', '[OK]')} ${message}`);
}

function showError(message) {
  console.log(`  ${c('brightRed', '[ERR]')} ${message}`);
}

function showWarning(message) {
  console.log(`  ${c('brightYellow', '[WARN]')} ${message}`);
}

function showInfo(message) {
  console.log(`  ${c('green', '[INFO]')} ${message}`);
}

function showStep(step, total, message) {
  const progress = `[${step}/${total}]`;
  console.log(`  ${c('brightGreen', progress)} ${message}`);
}

function showProgressBar(current, total, label = '') {
  const width = 30;
  const filled = Math.round((current / total) * width);
  const empty = Math.max(0, width - filled);
  const bar = `${'#'.repeat(filled)}${'.'.repeat(empty)}`;
  const percent = Math.round((current / total) * 100);
  console.log(`  ${c('brightGreen', bar)} ${c('white', `${percent}%`)} ${c('gray', label)}`);
}

function showBox(title, lines) {
  const maxLen = Math.max(title.length, ...lines.map((line) => stripAnsi(line).length));
  const width = maxLen + 4;
  const pad = (line) => {
    const text = String(line);
    const plainLength = stripAnsi(text).length;
    return `${text}${' '.repeat(Math.max(0, width - 2 - plainLength))}`;
  };

  console.log(`  ${c('brightGreen', `+${'-'.repeat(width)}+`)}`);
  console.log(`  ${c('brightGreen', '|')} ${c('bold', pad(title))}${c('brightGreen', '|')}`);
  console.log(`  ${c('brightGreen', `+${'-'.repeat(width)}+`)}`);
  lines.forEach((line) => {
    console.log(`  ${c('brightGreen', '|')} ${pad(line)}${c('brightGreen', '|')}`);
  });
  console.log(`  ${c('brightGreen', `+${'-'.repeat(width)}+`)}`);
}

function showDivider() {
  console.log(c('green', '  -------------------------------------------------------------'));
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

  showBox(`AGENT: ${data.agent || 'AMAD'}`, [
    `Level ${level} - ${title}`,
    `XP: ${xp} / ${nextLevelXP}`,
    '',
    `${c('gray', 'Stats:')}`,
    `  * Projects Completed: ${data.stats?.projects_completed || 0}`,
    `  * PRD Written:        ${data.stats?.prd_written || 0}`,
    `  * Security Fixes:     ${data.stats?.security_fixes || 0}`,
    `  * Stories Delivered:  ${data.stats?.stories_implemented || 0}`,
    `  * Domains Explored:   ${data.stats?.domains_explored || 0}`,
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
