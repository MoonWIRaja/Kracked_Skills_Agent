/**
 * Core Installer for Kracked_Skills Agent
 * Handles interactive & non-interactive installation
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('node:child_process');
const { showStep, showSuccess, showError, showWarning, showInfo, showDivider, c } = require('./display');
const { SUPPORTED_IDES, generateAdapter, generateIDEConfig } = require('./adapters');

const DEFAULT_AGENT_NAMES = {
  main: 'Amad',
  analyst: 'Ara',
  pm: 'Paan',
  architect: 'Adi',
  'tech-lead': 'Teja',
  engineer: 'Ezra',
  qa: 'Qila',
  security: 'Sari',
  devops: 'Dian',
  'release-manager': 'Rina',
};

const PROFESSIONAL_ROLES = [
  'analyst',
  'pm',
  'architect',
  'tech-lead',
  'engineer',
  'qa',
  'security',
  'devops',
  'release-manager',
];

const RANDOM_NAME_POOL = [
  'Denial',
  'Adam',
  'Akmal',
  'Amad',
  'Kaizer',
  'Matnep',
  'Aizad',
  'Kito',
  'Iquzo',
  'Naim',
  'Moon',
  'Qih',
  'Hakim',
  'Faris',
  'Iman',
  'Rafli',
  'Iqram',
  'Aiman',
  'Rayyan',
  'Danish',
  'Aqil',
  'Haikal',
  'Anas',
  'Syazwan',
  'Afiq',
  'Haziq',
];

function normalizeToolName(tool) {
  const value = String(tool || '').trim().toLowerCase();
  if (value === 'claude' || value === 'claudecode' || value === 'claude-code') {
    return 'claude-code';
  }
  return value;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureDirRecursive(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isValidObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function writePanelHelperScripts(targetDir) {
  const batContent = `@echo off
setlocal
set PANEL_DIR=%~dp0.kracked\\tools\\vscode-kd-pixel-panel
if not exist "%PANEL_DIR%\\package.json" (
  echo [KD] Native panel folder not found: %PANEL_DIR%
  exit /b 1
)
cd /d "%PANEL_DIR%"
echo [KD] Packaging VS Code panel extension...
call npx @vscode/vsce package
if errorlevel 1 exit /b 1
for %%f in (*.vsix) do (
  set VSIX=%%f
)
if "%VSIX%"=="" (
  echo [KD] No VSIX generated.
  exit /b 1
)
echo [KD] Installing %VSIX%...
code --install-extension "%PANEL_DIR%\\%VSIX%"
if errorlevel 1 exit /b 1
echo [KD] Native panel installed successfully.
`;

  const ps1Content = `$ErrorActionPreference = "Stop"
$panelDir = Join-Path $PSScriptRoot ".kracked/tools/vscode-kd-pixel-panel"
if (-not (Test-Path (Join-Path $panelDir "package.json"))) {
  Write-Error "[KD] Native panel folder not found: $panelDir"
}

Set-Location $panelDir
Write-Host "[KD] Packaging VS Code panel extension..."
npx @vscode/vsce package

$vsix = Get-ChildItem -Path $panelDir -Filter *.vsix | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $vsix) {
  Write-Error "[KD] No VSIX generated."
}

Write-Host "[KD] Installing $($vsix.FullName)..."
code --install-extension $vsix.FullName
Write-Host "[KD] Native panel installed successfully."
`;

  fs.writeFileSync(path.join(targetDir, 'kd-panel-install.bat'), batContent, 'utf8');
  fs.writeFileSync(path.join(targetDir, 'kd-panel-install.ps1'), ps1Content, 'utf8');
}

function toBooleanFlag(value) {
  if (typeof value === 'boolean') return value;
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
  return null;
}

function executableName(base) {
  return process.platform === 'win32' ? `${base}.cmd` : base;
}

function runCommand(cwd, command, args) {
  if (process.platform === 'win32') {
    const escapedArgs = args.map((arg) => `"${String(arg).replace(/"/g, '\\"')}"`);
    const commandLine = [command, ...escapedArgs].join(' ');
    return spawnSync(commandLine, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true,
    });
  }

  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function formatRunError(result) {
  if (!result) return 'unknown error';
  if (result.error && result.error.code === 'ENOENT') return 'command not found';
  if (result.error && result.error.message) return result.error.message;
  const stderr = (result.stderr || '').trim();
  if (stderr) return stderr.split('\n').slice(-1)[0];
  const stdout = (result.stdout || '').trim();
  if (stdout) return stdout.split('\n').slice(-1)[0];
  return `exit code ${result.status}`;
}

function tryInstallNativePanel(targetDir) {
  const panelDir = path.join(targetDir, '.kracked', 'tools', 'vscode-kd-pixel-panel');
  const packageJsonPath = path.join(panelDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return {
      ok: false,
      reason: `Native panel folder not found: ${panelDir}`,
    };
  }

  const npxResult = runCommand(panelDir, executableName('npx'), ['@vscode/vsce', 'package']);
  if (npxResult.status !== 0) {
    return {
      ok: false,
      reason: `Failed to package VSIX (${formatRunError(npxResult)})`,
    };
  }

  const vsixFiles = fs
    .readdirSync(panelDir)
    .filter((name) => name.toLowerCase().endsWith('.vsix'))
    .map((name) => ({
      name,
      fullPath: path.join(panelDir, name),
      mtimeMs: fs.statSync(path.join(panelDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (vsixFiles.length === 0) {
    return {
      ok: false,
      reason: 'VSIX file not generated',
    };
  }

  const vsixPath = vsixFiles[0].fullPath;
  const codeResult = runCommand(panelDir, executableName('code'), ['--install-extension', vsixPath]);
  if (codeResult.status !== 0) {
    return {
      ok: false,
      reason: `Failed to install VSIX (${formatRunError(codeResult)})`,
      vsixPath,
    };
  }

  return {
    ok: true,
    vsixPath,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceWholeWord(text, from, to) {
  if (!from || !to || from === to) return text;
  const pattern = new RegExp(`\\b${escapeRegExp(from)}\\b`, 'g');
  return text.replace(pattern, to);
}

function walkFiles(rootDir, extension = '.md') {
  if (!fs.existsSync(rootDir)) return [];
  const output = [];

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && fullPath.toLowerCase().endsWith(extension)) {
        output.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return output;
}

function shuffle(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = cloned[i];
    cloned[i] = cloned[j];
    cloned[j] = tmp;
  }
  return cloned;
}

function pickRandomNames(mainAgentName, count) {
  const used = new Set([mainAgentName.toLowerCase()]);
  const candidates = RANDOM_NAME_POOL.filter((name) => !used.has(name.toLowerCase()));
  const selected = [];

  for (const name of shuffle(candidates)) {
    const normalized = name.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    selected.push(normalized);
    if (selected.length === count) break;
  }

  let fallbackIndex = 1;
  while (selected.length < count) {
    const fallback = `Agent${fallbackIndex++}`;
    if (used.has(fallback.toLowerCase())) continue;
    used.add(fallback.toLowerCase());
    selected.push(fallback);
  }

  return selected;
}

function buildAgentRoster(mainAgentName) {
  const picked = pickRandomNames(mainAgentName, PROFESSIONAL_ROLES.length);
  const byRole = {};

  PROFESSIONAL_ROLES.forEach((role, index) => {
    byRole[role] = picked[index];
  });

  return {
    main: {
      role: 'master-agent',
      name: mainAgentName,
      internal_persona: DEFAULT_AGENT_NAMES.main,
    },
    byRole,
    professional: PROFESSIONAL_ROLES.map((role) => ({ role, name: byRole[role] })),
    generated_at: new Date().toISOString(),
  };
}

function applyAgentRosterToTemplates(krackDir, outputDir, mainAgentName, roster, options = {}) {
  const mutateOutput = options.mutateOutput !== false;
  const replacements = new Map([
    [DEFAULT_AGENT_NAMES.main, mainAgentName],
    [DEFAULT_AGENT_NAMES.analyst, roster.byRole.analyst],
    [DEFAULT_AGENT_NAMES.pm, roster.byRole.pm],
    [DEFAULT_AGENT_NAMES.architect, roster.byRole.architect],
    [DEFAULT_AGENT_NAMES['tech-lead'], roster.byRole['tech-lead']],
    [DEFAULT_AGENT_NAMES.engineer, roster.byRole.engineer],
    [DEFAULT_AGENT_NAMES.qa, roster.byRole.qa],
    [DEFAULT_AGENT_NAMES.security, roster.byRole.security],
    [DEFAULT_AGENT_NAMES.devops, roster.byRole.devops],
    [DEFAULT_AGENT_NAMES['release-manager'], roster.byRole['release-manager']],
  ]);

  const markdownFiles = mutateOutput
    ? [...walkFiles(krackDir, '.md'), ...walkFiles(outputDir, '.md')]
    : [...walkFiles(krackDir, '.md')];

  markdownFiles.forEach((filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = content;

    for (const [from, to] of replacements.entries()) {
      updated = replaceWholeWord(updated, from, to);
    }

    if (filePath.endsWith(path.join('prompts', 'system-prompt.md'))) {
      updated = updated.replace(/name:\s*"amad"/i, `name: "${mainAgentName.toLowerCase()}"`);
      updated = updated.replace(/persona:\s*"Amad"/, `persona: "${mainAgentName}"`);
      updated = updated.replace(/#\s+Amad\s+[-â€“â€”]\s+Master Agent/i, `# ${mainAgentName} â€” Master Agent`);
      updated = updated.replace(/You are \*\*Amad\*\*/i, `You are **${mainAgentName}**`);
    }

    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf8');
    }
  });
}

function ensureRuntimeFiles(krackDir) {
  const runtimeDir = path.join(krackDir, 'runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });

  const schemaFile = path.join(runtimeDir, 'SCHEMA.md');
  const eventsFile = path.join(runtimeDir, 'events.jsonl');
  const emitterFile = path.join(runtimeDir, 'emit-event.js');

  if (!fs.existsSync(schemaFile)) {
    const schema = `# KD Observer Event Schema

Location: {project-root}/.kracked/runtime/events.jsonl
Format: JSON Lines (one JSON object per line)

Required fields:
- ts
- agent_id
- agent_name
- role
- action
- source
`;
    fs.writeFileSync(schemaFile, schema, 'utf8');
  }

  if (!fs.existsSync(eventsFile)) {
    fs.writeFileSync(eventsFile, '', 'utf8');
  }

  if (!fs.existsSync(emitterFile)) {
    const emitter = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i++){const t=argv[i];if(!t.startsWith('--')) continue;const k=t.slice(2);const v=argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:'true';out[k]=v;}return out;}
function fail(msg){process.stderr.write('[KD] '+msg+'\\n');process.exit(1);}
const args=parseArgs(process.argv.slice(2));
for (const k of ['source','agent-id','agent-name','role','action']) { if(!args[k]) fail('Missing required argument --'+k); }
const runtimeDir = fs.existsSync(path.join(process.cwd(), '.kracked', 'runtime')) ? path.join(process.cwd(), '.kracked', 'runtime') : __dirname;
const eventsPath = path.join(runtimeDir, 'events.jsonl');
const event = { ts:new Date().toISOString(), agent_id:args['agent-id'], agent_name:args['agent-name'], role:args.role, action:args.action, source:args.source };
if (args['target-agent-id']) event.target_agent_id=args['target-agent-id'];
if (args.task) event.task=args.task;
if (args.message) event.message=args.message;
fs.mkdirSync(runtimeDir, { recursive: true });
fs.appendFileSync(eventsPath, JSON.stringify(event)+'\\n', 'utf8');
process.stdout.write('[KD] Event appended\\n');
`;
    fs.writeFileSync(emitterFile, emitter, 'utf8');
  }
}

async function install(args) {
  const targetDir = path.resolve(args.directory || process.cwd());
  const templatesDir = path.join(__dirname, '..', 'templates');
  const totalSteps = 7;
  let currentStep = 0;

  console.log(c('brightWhite', '  Installing Kracked_Skills Agent (KD)...\n'));

  currentStep++;
  showStep(currentStep, totalSteps, 'Checking existing installation...');
  const krackDir = path.join(targetDir, '.kracked');
  const wasInstalled = fs.existsSync(krackDir);

  let existingXp = null;
  const preservedFiles = new Map();

  function preserveFile(filePath) {
    if (!wasInstalled || !fs.existsSync(filePath)) return;
    preservedFiles.set(filePath, fs.readFileSync(filePath, 'utf8'));
  }

  if (wasInstalled) {
    const xpPath = path.join(krackDir, 'security', 'xp.json');
    if (fs.existsSync(xpPath)) {
      try {
        existingXp = JSON.parse(fs.readFileSync(xpPath, 'utf8'));
      } catch {
        existingXp = null;
      }
    }

    preserveFile(path.join(krackDir, 'runtime', 'events.jsonl'));
    preserveFile(path.join(krackDir, 'skills', 'memories', 'SKILL.md'));
    preserveFile(path.join(krackDir, 'security', 'knowledge.md'));
  }

  if (wasInstalled) {
    if (!args.yes) {
      const answer = await prompt(`  ${c('yellow', 'Ã¢Å¡Â Ã¯Â¸Â')}  KD already installed. Overwrite? (y/N): `);
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        showInfo('Installation cancelled.');
        return;
      }
    }
    showWarning('Overwriting existing installation...');
  }

  currentStep++;
  showStep(currentStep, totalSteps, 'Language configuration...');

  let language = args.language;
  if (!language && !args.yes) {
    console.log('');
    console.log(`  ${c('brightWhite', 'Select language / Pilih bahasa:')}`);
    console.log(`    ${c('cyan', '1.')} English (EN)`);
    console.log(`    ${c('cyan', '2.')} Bahasa Melayu (MS)`);
    console.log(`    ${c('cyan', '3.')} Custom (type your language)`);
    console.log('');
    const langAnswer = await prompt(`  ${c('brightCyan', '->')} Choose [1/2/3]: `);

    switch (langAnswer) {
      case '1':
        language = 'EN';
        break;
      case '2':
        language = 'MS';
        break;
      case '3':
        language = await prompt(`  ${c('brightCyan', '->')} Enter language name: `);
        break;
      default:
        language = 'EN';
    }
  }
  if (!language) language = 'EN';
  showSuccess(`Language: ${language}`);

  currentStep++;
  showStep(currentStep, totalSteps, 'IDE tools configuration...');

  let selectedTools = [];
  if (args.tools) {
    selectedTools = args.tools.split(',').map((t) => normalizeToolName(t));
  } else if (!args.yes) {
    console.log('');
    console.log(`  ${c('brightWhite', 'Select AI IDE tools to configure:')}`);
    SUPPORTED_IDES.forEach((ide, i) => {
      console.log(`    ${c('cyan', `${i + 1}.`)} ${ide}`);
    });
    console.log(`    ${c('cyan', 'A.')} All tools`);
    console.log('');
    const toolAnswer = await prompt(`  ${c('brightCyan', '->')} Choose (comma-separated, e.g. 1,2,3 or A): `);

    if (toolAnswer.toLowerCase() === 'a') {
      selectedTools = [...SUPPORTED_IDES];
    } else {
      const nums = toolAnswer.split(',').map((n) => parseInt(n.trim(), 10) - 1);
      selectedTools = nums
        .filter((n) => n >= 0 && n < SUPPORTED_IDES.length)
        .map((n) => SUPPORTED_IDES[n]);
    }
  } else {
    selectedTools = [...SUPPORTED_IDES];
  }

  selectedTools = [...new Set(selectedTools)];
  if (selectedTools.length === 0) {
    selectedTools = [...SUPPORTED_IDES];
  }
  showSuccess(`Tools: ${selectedTools.join(', ')}`);

  currentStep++;
  showStep(currentStep, totalSteps, 'Project configuration...');

  let projectName = args.name;
  if (!projectName && !args.yes) {
    projectName = await prompt(`  ${c('brightCyan', '->')} Project name (default: ${path.basename(targetDir)}): `);
  }
  if (!projectName) projectName = path.basename(targetDir);
  showSuccess(`Project: ${projectName}`);

  let mainAgentName = args.agent;
  if (!mainAgentName && !args.yes) {
    mainAgentName = await prompt(`  ${c('brightCyan', '->')} Main agent name (default: ${DEFAULT_AGENT_NAMES.main}): `);
  }
  if (!mainAgentName) mainAgentName = DEFAULT_AGENT_NAMES.main;
  showSuccess(`Main Agent: ${mainAgentName}`);

  const roster = buildAgentRoster(mainAgentName);
  showSuccess(`Professional Agents: ${roster.professional.map((a) => a.name).join(', ')}`);

  let installPanelNow = toBooleanFlag(args.panel);
  if (installPanelNow == null && !args.yes) {
    const panelAnswer = await prompt(
      `  ${c('brightCyan', '->')} Install native Pixel panel now? (requires VS Code CLI) (y/N): `
    );
    installPanelNow = panelAnswer.toLowerCase() === 'y' || panelAnswer.toLowerCase() === 'yes';
  }
  if (installPanelNow == null) installPanelNow = false;
  showSuccess(`Native Panel Install: ${installPanelNow ? 'enabled' : 'skip for now'}`);

  currentStep++;
  showStep(currentStep, totalSteps, 'Copying KD system files...');
  showDivider();

  const krackSrc = path.join(templatesDir, '.kracked');
  if (fs.existsSync(krackSrc)) {
    copyDirRecursive(krackSrc, krackDir);
    showSuccess('.kracked/ Ã¢â‚¬â€ agents, skills, prompts, templates, workflows');
  } else {
    showWarning('Templates directory not found, creating structure...');
    createMinimalStructure(krackDir);
  }

  const outputSrc = path.join(templatesDir, 'KD_output');
  const outputDir = path.join(targetDir, 'KD_output');
  if (fs.existsSync(outputSrc)) {
    if (wasInstalled && fs.existsSync(outputDir)) {
      createOutputStructure(outputDir);
      showSuccess('KD_output/ preserved existing files (new folders ensured)');
    } else {
      copyDirRecursive(outputSrc, outputDir);
      showSuccess('KD_output/ status, discovery, PRD, architecture, etc.');
    }
  } else {
    createOutputStructure(outputDir);
    showSuccess('KD_output/ created output structure');
  }

  const panelSrc = path.join(__dirname, '..', 'ide', 'vscode-kd-pixel-panel');
  const panelDest = path.join(krackDir, 'tools', 'vscode-kd-pixel-panel');
  if (fs.existsSync(panelSrc)) {
    copyDirRecursive(panelSrc, panelDest);
    writePanelHelperScripts(targetDir);
    showSuccess('.kracked/tools/vscode-kd-pixel-panel + kd-panel-install scripts created');
  } else {
    showWarning('Native panel source not found; skipping panel scaffolding');
  }

  applyAgentRosterToTemplates(krackDir, outputDir, mainAgentName, roster, { mutateOutput: !wasInstalled });
  ensureRuntimeFiles(krackDir);
  for (const [filePath, content] of preservedFiles.entries()) {
    ensureDirRecursive(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
  }
  if (preservedFiles.size > 0) {
    showInfo('Preserved user runtime/memory files from previous installation');
  }
  showSuccess('Agent personas randomized and personalized');

  currentStep++;
  showStep(currentStep, totalSteps, 'Generating IDE adapter files...');

  const allAdapterFiles = [];
  for (const ide of selectedTools) {
    try {
      const files = generateAdapter(targetDir, ide, { mainAgentName, roster });
      generateIDEConfig(targetDir, ide);
      allAdapterFiles.push(...files);
      showSuccess(`${ide} Ã¢â‚¬â€ ${files.length} file(s) generated`);
    } catch (err) {
      showError(`${ide} Ã¢â‚¬â€ ${err.message}`);
    }
  }

  currentStep++;
  showStep(currentStep, totalSteps, 'Writing configuration...');

  const configDir = path.join(krackDir, 'config');
  fs.mkdirSync(configDir, { recursive: true });

  const settings = {
    project: {
      name: projectName,
      main_agent_name: mainAgentName,
      created_at: new Date().toISOString(),
    },
    language: {
      default: language,
      communication: language === 'MS' ? 'Bahasa Melayu' : language === 'EN' ? 'English' : language,
      document_output: language === 'MS' ? 'Bahasa Melayu' : language === 'EN' ? 'English' : language,
    },
    ides: selectedTools,
    output_folder: '{project-root}/KD_output',
    memory: {
      local_path: './.kracked/',
      global_path: '~/.kracked/global/',
      sync_on_complete: true,
    },
  };

  fs.writeFileSync(path.join(configDir, 'settings.json'), JSON.stringify(settings, null, 2), 'utf8');
  fs.writeFileSync(path.join(configDir, 'agents.json'), JSON.stringify(roster, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(configDir, 'main-agent.json'),
    JSON.stringify(
      {
        name: mainAgentName,
        internal_persona: DEFAULT_AGENT_NAMES.main,
        role: 'master-agent',
        updated_at: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );

  const manifest = `installation:
  version: 1.0.0
  installDate: ${new Date().toISOString()}
  lastUpdated: ${new Date().toISOString()}
  projectName: ${projectName}
  mainAgent: ${mainAgentName}
  language: ${language}
ides:
${selectedTools.map((t) => `  - ${t}`).join('\n')}
`;

  const configRootDir = path.join(krackDir, '_config');
  fs.mkdirSync(configRootDir, { recursive: true });
  fs.writeFileSync(path.join(configRootDir, 'manifest.yaml'), manifest, 'utf8');

  const securityDir = path.join(krackDir, 'security');
  fs.mkdirSync(securityDir, { recursive: true });

  const baseXpData = {
    agent: mainAgentName,
    level: 1,
    xp: 0,
    title: 'Novice',
    history: [],
    stats: {
      projects_completed: 0,
      prd_written: 0,
      security_fixes: 0,
      stories_implemented: 0,
      domains_explored: 0,
    },
  };

  const xpData = isValidObject(existingXp)
    ? {
      ...baseXpData,
      ...existingXp,
      agent: mainAgentName,
      history: Array.isArray(existingXp.history) ? existingXp.history : [],
      stats: {
        ...baseXpData.stats,
        ...(isValidObject(existingXp.stats) ? existingXp.stats : {}),
      },
    }
    : baseXpData;

  fs.writeFileSync(path.join(securityDir, 'xp.json'), JSON.stringify(xpData, null, 2), 'utf8');

  const statusPath = path.join(outputDir, 'status', 'status.md');
  if (!fs.existsSync(statusPath)) {
    writeInitialStatus(outputDir, projectName, mainAgentName);
  } else {
    showInfo('Preserved existing KD_output/status/status.md');
  }

  if (installPanelNow) {
    showInfo('Installing native Pixel panel...');
    const panelResult = tryInstallNativePanel(targetDir);
    if (panelResult.ok) {
      showSuccess(`Native panel installed (${path.basename(panelResult.vsixPath)})`);
    } else {
      showWarning(`Native panel auto-install failed: ${panelResult.reason}`);
      showInfo('Run kd-panel-install.bat or kd-panel-install.ps1 later to install manually');
    }
  } else {
    showInfo('Native panel skipped. Use kd-panel-install.bat or kd-panel-install.ps1 anytime');
  }

  showSuccess('Configuration saved');

  showDivider();
  console.log('');
  console.log(c('brightGreen', '  Ã¢Å“â€¦ Kracked_Skills Agent (KD) installed successfully!'));
  console.log('');
  console.log(`  ${c('brightWhite', 'Project:')} ${projectName}`);
  console.log(`  ${c('brightWhite', 'Main Agent:')} ${mainAgentName}`);
  console.log(`  ${c('brightWhite', 'Language:')} ${language}`);
  console.log(`  ${c('brightWhite', 'Tools:')} ${selectedTools.join(', ')}`);
  console.log(`  ${c('brightWhite', 'Files:')} ${allAdapterFiles.length + 10}+ files created`);
  console.log('');
  console.log(c('gray', '  Next steps:'));
  console.log(`    1. Open your AI IDE in this project folder`);
  console.log(`    2. Type ${c('cyan', '/kd')} to see all available commands`);
  console.log(`    3. Type ${c('cyan', '/kd-help')} for guidance on what to do next`);
  console.log(`    4. Type ${c('cyan', '/kd-analyze')} to start Discovery phase`);
  console.log('');
  console.log(c('brightYellow', '  Ã¢Å¡Â¡ KD finishes what it starts.'));
  console.log('');
}

function createMinimalStructure(krackDir) {
  const dirs = [
    'agents',
    'skills',
    'prompts',
    'prompts/roles',
    'prompts/stages',
    'prompts/multi-agent',
    'templates',
    'checklists',
    'workflows',
    'gates',
    'knowledge',
    'runtime',
    'config',
    'config/language',
    'security',
    '_config',
    '_config/ides',
  ];

  dirs.forEach((d) => fs.mkdirSync(path.join(krackDir, d), { recursive: true }));
}

function createOutputStructure(outputDir) {
  const dirs = [
    'status',
    'discovery',
    'brainstorm',
    'product-brief',
    'PRD',
    'architecture',
    'epics-and-stories',
    'code-review',
    'deployment',
    'release',
  ];

  dirs.forEach((d) => fs.mkdirSync(path.join(outputDir, d), { recursive: true }));
}

function writeInitialStatus(outputDir, projectName, mainAgentName) {
  const statusDir = path.join(outputDir, 'status');
  fs.mkdirSync(statusDir, { recursive: true });

  const statusContent = `# Status Projek: ${projectName}
*Terakhir dikemas kini: ${new Date().toISOString()}*
*Dikemas kini oleh: ${mainAgentName}*

## Ringkasan
- **Skala**: Belum ditentukan (jalankan /kd-analyze)
- **Peringkat Semasa**: Setup
- **Progress Sprint**: Tiada sprint aktif
- **Level Agen**: Level 1 (0/300 XP) - Novice

## Sedang Dikerjakan
Projek baru diinisialisasi. Menunggu arahan pertama dari pengguna.

## Baru Selesai
- [x] Projek diinisialisasi
- [x] Fail KD dicipta

## Seterusnya
- [ ] Jalankan \`/kd-analyze\` untuk mulakan Discovery
- [ ] Jawab 4 soalan Scale Assessment
- [ ] Tentukan skala projek (SMALL/STANDARD/DEEP)

## Halangan
Tiada halangan buat masa ini.

## Fail yang Dikemas Kini
- .kracked/ - Sistem KD diinisialisasi
- KD_output/status/status.md - Fail ini
`;

  fs.writeFileSync(path.join(statusDir, 'status.md'), statusContent, 'utf8');
}

module.exports = { install };

