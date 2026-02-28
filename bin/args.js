/**
 * CLI Argument Parser for Kracked_Skills Agent
 */

function parseArgs(argv) {
  const result = {
    command: null,
    directory: process.cwd(),
    language: null,        // EN, MS, or custom
    tools: null,           // comma-separated list of IDE tools
    name: null,            // project name
    agent: null,           // main agent display name
    panel: null,           // install native panel now: true/false/null
    interval: null,        // observer refresh interval
    maxEvents: null,       // observer max rows
    maxHistory: null,      // observer max parsed history
    yes: false,            // non-interactive mode
  };

  let i = 0;

  // First non-flag argument is the command
  if (argv.length > 0 && !argv[0].startsWith('-')) {
    result.command = argv[0].toLowerCase();
    i = 1;
  }

  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '--directory':
      case '-d':
        result.directory = argv[++i] || process.cwd();
        break;

      case '--language':
      case '-l':
        result.language = argv[++i] || null;
        break;

      case '--tools':
      case '-t':
        result.tools = argv[++i] || null;
        break;

      case '--name':
      case '-n':
        result.name = argv[++i] || null;
        break;

      case '--agent':
      case '-a':
        result.agent = argv[++i] || null;
        break;

      case '--panel':
        if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
          const value = String(argv[++i]).toLowerCase();
          result.panel = value === '1' || value === 'true' || value === 'yes' || value === 'y';
        } else {
          result.panel = true;
        }
        break;

      case '--no-panel':
        result.panel = false;
        break;

      case '--yes':
      case '-y':
        result.yes = true;
        break;

      case '--interval':
        result.interval = argv[++i] || null;
        break;

      case '--max-events':
        result.maxEvents = argv[++i] || null;
        break;

      case '--max-history':
        result.maxHistory = argv[++i] || null;
        break;

      case '--help':
      case '-h':
        result.command = 'help';
        break;

      case '--version':
      case '-v':
        result.command = 'version';
        break;

      default:
        // Unknown flag, skip
        break;
    }

    i++;
  }

  return result;
}

module.exports = { parseArgs };
