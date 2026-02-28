/**
 * Core Installer for Kracked_Skills Agent
 * Handles interactive & non-interactive installation
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { showStep, showSuccess, showError, showWarning, showInfo, showDivider, c } = require('./display');
const { SUPPORTED_IDES, generateAdapter, generateIDEConfig } = require('./adapters');

/**
 * Prompt user for input (interactive mode)
 */
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Copy directory recursively
 */
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

/**
 * Main install function
 */
async function install(args) {
  const targetDir = path.resolve(args.directory || process.cwd());
  const templatesDir = path.join(__dirname, '..', 'templates');
  const totalSteps = 7;
  let currentStep = 0;

  console.log(c('brightWhite', '  Installing Kracked_Skills Agent (KD)...\n'));

  // Step 1: Check if already installed
  currentStep++;
  showStep(currentStep, totalSteps, 'Checking existing installation...');
  const krackDir = path.join(targetDir, '.kracked');

  if (fs.existsSync(krackDir)) {
    if (!args.yes) {
      const answer = await prompt(`  ${c('yellow', '⚠️')}  KD already installed. Overwrite? (y/N): `);
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        showInfo('Installation cancelled.');
        return;
      }
    }
    showWarning('Overwriting existing installation...');
  }

  // Step 2: Get language preference
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
    const langAnswer = await prompt(`  ${c('brightCyan', '→')} Choose [1/2/3]: `);

    switch (langAnswer) {
      case '1': language = 'EN'; break;
      case '2': language = 'MS'; break;
      case '3':
        language = await prompt(`  ${c('brightCyan', '→')} Enter language name: `);
        break;
      default: language = 'EN';
    }
  }
  if (!language) language = 'EN';
  showSuccess(`Language: ${language}`);

  // Step 3: Get IDE tools
  currentStep++;
  showStep(currentStep, totalSteps, 'IDE tools configuration...');

  let selectedTools = [];
  if (args.tools) {
    selectedTools = args.tools.split(',').map(t => t.trim().toLowerCase());
  } else if (!args.yes) {
    console.log('');
    console.log(`  ${c('brightWhite', 'Select AI IDE tools to configure:')}`);
    SUPPORTED_IDES.forEach((ide, i) => {
      console.log(`    ${c('cyan', `${i + 1}.`)} ${ide}`);
    });
    console.log(`    ${c('cyan', 'A.')} All tools`);
    console.log('');
    const toolAnswer = await prompt(`  ${c('brightCyan', '→')} Choose (comma-separated, e.g. 1,2,3 or A): `);

    if (toolAnswer.toLowerCase() === 'a') {
      selectedTools = [...SUPPORTED_IDES];
    } else {
      const nums = toolAnswer.split(',').map(n => parseInt(n.trim()) - 1);
      selectedTools = nums
        .filter(n => n >= 0 && n < SUPPORTED_IDES.length)
        .map(n => SUPPORTED_IDES[n]);
    }
  } else {
    selectedTools = [...SUPPORTED_IDES]; // Default: all
  }

  if (selectedTools.length === 0) {
    selectedTools = [...SUPPORTED_IDES];
  }
  showSuccess(`Tools: ${selectedTools.join(', ')}`);

  // Step 4: Get project name
  currentStep++;
  showStep(currentStep, totalSteps, 'Project configuration...');

  let projectName = args.name;
  if (!projectName && !args.yes) {
    projectName = await prompt(`  ${c('brightCyan', '→')} Project name (default: ${path.basename(targetDir)}): `);
  }
  if (!projectName) projectName = path.basename(targetDir);
  showSuccess(`Project: ${projectName}`);

  // Step 5: Copy templates
  currentStep++;
  showStep(currentStep, totalSteps, 'Copying KD system files...');
  showDivider();

  // Copy .kracked/ templates
  const krackSrc = path.join(templatesDir, '.kracked');
  if (fs.existsSync(krackSrc)) {
    copyDirRecursive(krackSrc, krackDir);
    showSuccess('.kracked/ — agents, skills, prompts, templates, workflows');
  } else {
    showWarning('Templates directory not found, creating structure...');
    createMinimalStructure(krackDir);
  }

  // Copy KD_output/ templates
  const outputSrc = path.join(templatesDir, 'KD_output');
  const outputDir = path.join(targetDir, 'KD_output');
  if (fs.existsSync(outputSrc)) {
    copyDirRecursive(outputSrc, outputDir);
    showSuccess('KD_output/ — status, discovery, PRD, architecture, etc.');
  } else {
    createOutputStructure(outputDir);
    showSuccess('KD_output/ — created output structure');
  }

  // Step 6: Generate adapter files
  currentStep++;
  showStep(currentStep, totalSteps, 'Generating IDE adapter files...');

  const allAdapterFiles = [];
  for (const ide of selectedTools) {
    try {
      const files = generateAdapter(targetDir, ide);
      generateIDEConfig(targetDir, ide);
      allAdapterFiles.push(...files);
      showSuccess(`${ide} — ${files.length} file(s) generated`);
    } catch (err) {
      showError(`${ide} — ${err.message}`);
    }
  }

  // Step 7: Write config
  currentStep++;
  showStep(currentStep, totalSteps, 'Writing configuration...');

  // Write settings.json
  const configDir = path.join(krackDir, 'config');
  fs.mkdirSync(configDir, { recursive: true });

  const settings = {
    project: {
      name: projectName,
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

  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify(settings, null, 2),
    'utf8'
  );

  // Write manifest.yaml
  const manifest = `installation:
  version: 1.0.0
  installDate: ${new Date().toISOString()}
  lastUpdated: ${new Date().toISOString()}
  projectName: ${projectName}
  language: ${language}
ides:
${selectedTools.map(t => `  - ${t}`).join('\n')}
`;

  const configRootDir = path.join(krackDir, '_config');
  fs.mkdirSync(configRootDir, { recursive: true });
  fs.writeFileSync(path.join(configRootDir, 'manifest.yaml'), manifest, 'utf8');

  // Write initial XP
  const securityDir = path.join(krackDir, 'security');
  fs.mkdirSync(securityDir, { recursive: true });

  const xpData = {
    agent: 'Amad',
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

  fs.writeFileSync(
    path.join(securityDir, 'xp.json'),
    JSON.stringify(xpData, null, 2),
    'utf8'
  );

  // Write initial status.md
  writeInitialStatus(outputDir, projectName, language);

  showSuccess('Configuration saved');

  // Summary
  showDivider();
  console.log('');
  console.log(c('brightGreen', '  ✅ Kracked_Skills Agent (KD) installed successfully!'));
  console.log('');
  console.log(`  ${c('brightWhite', 'Project:')} ${projectName}`);
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
  console.log(c('brightYellow', '  ⚡ KD finishes what it starts.'));
  console.log('');
}

/**
 * Create minimal .kracked/ structure if templates dir missing
 */
function createMinimalStructure(krackDir) {
  const dirs = [
    'agents', 'skills', 'prompts', 'prompts/roles', 'prompts/stages',
    'prompts/multi-agent', 'templates', 'checklists', 'workflows',
    'gates', 'knowledge', 'config', 'config/language', 'security',
    '_config', '_config/ides',
  ];

  dirs.forEach(d => fs.mkdirSync(path.join(krackDir, d), { recursive: true }));
}

/**
 * Create KD_output/ structure
 */
function createOutputStructure(outputDir) {
  const dirs = [
    'status', 'discovery', 'brainstorm', 'product-brief',
    'PRD', 'architecture', 'epics-and-stories', 'code-review',
    'deployment', 'release',
  ];

  dirs.forEach(d => fs.mkdirSync(path.join(outputDir, d), { recursive: true }));
}

/**
 * Write initial status.md
 */
function writeInitialStatus(outputDir, projectName, language) {
  const statusDir = path.join(outputDir, 'status');
  fs.mkdirSync(statusDir, { recursive: true });

  const statusContent = `# Status Projek: ${projectName}
*Terakhir dikemas kini: ${new Date().toISOString()}*
*Dikemas kini oleh: Amad*

## 📊 Ringkasan
- **Skala**: Belum ditentukan (jalankan /kd-analyze)
- **Peringkat Semasa**: Setup
- **Progress Sprint**: Tiada sprint aktif
- **Level Agen**: Level 1 (0/300 XP) — Novice

## 🎯 Sedang Dikerjakan
Projek baru diinisialisasi. Menunggu arahan pertama dari pengguna.

## ✅ Baru Selesai
- [x] Projek diinisialisasi
- [x] Fail KD dicipta

## 📋 Seterusnya
- [ ] Jalankan \`/kd-analyze\` untuk mulakan Discovery
- [ ] Jawab 4 soalan Scale Assessment
- [ ] Tentukan skala projek (SMALL/STANDARD/DEEP)

## 🚧 Halangan
Tiada halangan buat masa ini.

## 📁 Fail yang Dikemas Kini
- .kracked/ — Sistem KD diinisialisasi
- KD_output/status/status.md — Fail ini
`;

  fs.writeFileSync(path.join(statusDir, 'status.md'), statusContent, 'utf8');
}

module.exports = { install };
