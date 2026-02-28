/**
 * Adapter Generator for Kracked_Skills Agent
 * Generates IDE-specific adapter files for 6 supported tools
 *
 * Supported IDEs:
 *   - codex       → .codex/INSTRUCTIONS.md
 *   - antigravity → .agent/workflows/ + .agents/skills/
 *   - cursor      → .cursor/commands/
 *   - opencode    → .opencode/agents/ + .opencode/skills/
 *   - kilocode    → .kilocode/workflows/ + .kilocodemodes
 *   - cline       → .clinerules/workflows/
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED_IDES = ['codex', 'antigravity', 'cursor', 'opencode', 'kilocode', 'cline'];

/**
 * Get KD workflow/command files data
 * These are adapter-compatible wrappers that point to the main .kracked/ system
 */
function getCommandFiles() {
  return [
    {
      name: 'kd',
      description: 'Show KD interactive command menu. Lists all available commands and agents.',
      taskRef: '{project-root}/.kracked/workflows/KD.md',
    },
    {
      name: 'kd-new',
      description: 'Initialize a new KD project workspace. Runs Scale Assessment and creates .kracked/ structure.',
      taskRef: '{project-root}/.kracked/workflows/KD-NEW.md',
    },
    {
      name: 'kd-kickoff',
      description: 'Resume an existing project. Loads context from status.md and orients the agent.',
      taskRef: '{project-root}/.kracked/workflows/KD-kickoff.md',
    },
    {
      name: 'kd-help',
      description: 'Smart guidance — tells you what to do next based on current project state. Can combine with questions.',
      taskRef: '{project-root}/.kracked/workflows/KD-help.md',
    },
    {
      name: 'kd-status',
      description: 'Display current project status from status.md — stage, progress, recent work, and next steps.',
      taskRef: '{project-root}/.kracked/workflows/KD-status.md',
    },
    {
      name: 'kd-analyze',
      description: '[ANALYST] Start Discovery phase — Scale Assessment, risk analysis, and stakeholder identification.',
      taskRef: '{project-root}/.kracked/workflows/KD-analyze.md',
    },
    {
      name: 'kd-brainstorm',
      description: '[ANALYST+PM] Brainstorming session — generate 3-5 approaches with scoring and consensus.',
      taskRef: '{project-root}/.kracked/workflows/KD-brainstorm.md',
    },
    {
      name: 'kd-prd',
      description: '[PM] Generate full PRD — personas, metrics, risks, acceptance criteria.',
      taskRef: '{project-root}/.kracked/workflows/KD-prd.md',
    },
    {
      name: 'kd-arch',
      description: '[ARCH+SEC] Architecture design — tech stack, system diagrams, API design, security review.',
      taskRef: '{project-root}/.kracked/workflows/KD-arch.md',
    },
    {
      name: 'kd-story',
      description: '[TL] Break epic into user stories with acceptance criteria.',
      taskRef: '{project-root}/.kracked/workflows/KD-story.md',
    },
    {
      name: 'kd-dev-story',
      description: '[ENG] Implement a user story using TDD approach — tests first, then code.',
      taskRef: '{project-root}/.kracked/workflows/KD-dev-story.md',
    },
    {
      name: 'kd-code-review',
      description: '[QA+SEC] Systematic code review — quality, security, test coverage.',
      taskRef: '{project-root}/.kracked/workflows/KD-code-review.md',
    },
    {
      name: 'kd-deploy',
      description: '[DEVOPS] Generate deployment plan — CI/CD, preflight check, rollback plan.',
      taskRef: '{project-root}/.kracked/workflows/KD-deploy.md',
    },
    {
      name: 'kd-release',
      description: '[RM] Create release notes, update changelog, sync knowledge to global memory.',
      taskRef: '{project-root}/.kracked/workflows/KD-release.md',
    },
    {
      name: 'kd-sprint-planning',
      description: 'Initialize sprint tracking — select stories, set goals, assign to agents.',
      taskRef: '{project-root}/.kracked/workflows/KD-sprint-planning.md',
    },
    {
      name: 'kd-sprint-review',
      description: 'Review current sprint progress — completed stories, remaining work.',
      taskRef: '{project-root}/.kracked/workflows/KD-sprint-review.md',
    },
    {
      name: 'kd-retrospective',
      description: 'Run retrospective — what went well, what needs improvement, action items.',
      taskRef: '{project-root}/.kracked/workflows/KD-retrospective.md',
    },
    {
      name: 'kd-refactor',
      description: '[TL+ENG] Guided refactoring with tech lead oversight.',
      taskRef: '{project-root}/.kracked/workflows/KD-refactor.md',
    },
    {
      name: 'kd-validate',
      description: 'Validate that output meets requirements — run validation block.',
      taskRef: '{project-root}/.kracked/workflows/KD-validate.md',
    },
    {
      name: 'kd-role-analyst',
      description: 'Activate full Analyst mode — become [ANALYST] Ara for deep analysis.',
      taskRef: '{project-root}/.kracked/workflows/KD-role-analyst.md',
    },
    {
      name: 'kd-api-design',
      description: '[ARCH] Design robust REST/GraphQL endpoints with security best practices.',
      taskRef: '{project-root}/.kracked/workflows/KD-api-design.md',
    },
    {
      name: 'kd-db-schema',
      description: '[ARCH] Generate and optimize database schema design.',
      taskRef: '{project-root}/.kracked/workflows/KD-db-schema.md',
    },
    {
      name: 'kd-test',
      description: '[QA] Generate test suite for current code — unit, integration, e2e.',
      taskRef: '{project-root}/.kracked/workflows/KD-test.md',
    },
    {
      name: 'kd-security-audit',
      description: '[SEC] Full security audit — OWASP Top 10, dependency check, with XP reward.',
      taskRef: '{project-root}/.kracked/workflows/KD-security-audit.md',
    },
  ];
}

/**
 * Generate a standard workflow/command markdown file
 */
function generateCommandMarkdown(cmd, ideType) {
  return `---
name: '${cmd.name}'
description: '${cmd.description}'
---

# ${cmd.name}

Read the entire workflow file at: ${cmd.taskRef}

Follow all instructions in the workflow file exactly as written.
Also load the system prompt from: {project-root}/.kracked/prompts/system-prompt.md
`;
}

/**
 * Generate adapter files for a specific IDE
 */
function generateAdapter(targetDir, ide) {
  const commands = getCommandFiles();

  switch (ide) {
    case 'codex':
      return generateCodexAdapter(targetDir, commands);
    case 'antigravity':
      return generateAntigravityAdapter(targetDir, commands);
    case 'cursor':
      return generateCursorAdapter(targetDir, commands);
    case 'opencode':
      return generateOpenCodeAdapter(targetDir, commands);
    case 'kilocode':
      return generateKiloCodeAdapter(targetDir, commands);
    case 'cline':
      return generateClineAdapter(targetDir, commands);
    default:
      throw new Error(`Unsupported IDE: ${ide}`);
  }
}

function generateCodexAdapter(targetDir, commands) {
  const dir = path.join(targetDir, '.codex');
  fs.mkdirSync(dir, { recursive: true });

  // Codex uses INSTRUCTIONS.md as main entry point
  const instructions = `# Kracked_Skills Agent (KD) — Codex Adapter

You are integrated with the Kracked_Skills Agent (KD) system.

## Activation
Read and follow the system prompt at: {project-root}/.kracked/prompts/system-prompt.md

## Available Commands
${commands.map(cmd => `- \`/${cmd.name}\` — ${cmd.description}`).join('\n')}

## How to Process Commands
When the user types any /kd-* command:
1. Load the corresponding workflow file from {project-root}/.kracked/workflows/
2. Load the system prompt from {project-root}/.kracked/prompts/system-prompt.md
3. Follow all instructions exactly as written in the workflow file
4. Update {project-root}/KD_output/status/status.md after every response
`;

  fs.writeFileSync(path.join(dir, 'INSTRUCTIONS.md'), instructions, 'utf8');
  return ['.codex/INSTRUCTIONS.md'];
}

function generateAntigravityAdapter(targetDir, commands) {
  const workflowDir = path.join(targetDir, '.agent', 'workflows');
  const skillsDir = path.join(targetDir, '.agents', 'skills');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  const files = [];

  // Generate workflow files for .agent/workflows/
  commands.forEach(cmd => {
    const content = generateCommandMarkdown(cmd, 'antigravity');
    const filename = `${cmd.name}.md`;
    fs.writeFileSync(path.join(workflowDir, filename), content, 'utf8');
    files.push(`.agent/workflows/${filename}`);
  });

  // Generate a SKILL.md for .agents/skills/
  const skillContent = `---
name: 'kracked-skills-agent'
description: 'KD Multi-Agent System — 9 specialized agents, 8 structured stages, XP leveling'
---

# Kracked_Skills Agent (KD)

Read and follow the system prompt at: {project-root}/.kracked/prompts/system-prompt.md

This skill provides a complete AI multi-agent development system with:
- 9 specialized agent roles (Analyst, PM, Architect, Tech Lead, Engineer, QA, Security, DevOps, Release Manager)
- 8 structured development stages (Discovery → Release)
- XP leveling system (Novice → Grandmaster)
- Session memory that persists across conversations
- Scale-adaptive workflows (SMALL/STANDARD/DEEP)
`;

  fs.writeFileSync(path.join(skillsDir, 'kracked-skills-agent', 'SKILL.md'), skillContent, 'utf8');
  files.push('.agents/skills/kracked-skills-agent/SKILL.md');

  return files;
}

function generateCursorAdapter(targetDir, commands) {
  const dir = path.join(targetDir, '.cursor', 'commands');
  fs.mkdirSync(dir, { recursive: true });

  const files = [];

  commands.forEach(cmd => {
    const content = generateCommandMarkdown(cmd, 'cursor');
    const filename = `${cmd.name}.md`;
    fs.writeFileSync(path.join(dir, filename), content, 'utf8');
    files.push(`.cursor/commands/${filename}`);
  });

  return files;
}

function generateOpenCodeAdapter(targetDir, commands) {
  const agentsDir = path.join(targetDir, '.opencode', 'agents');
  const skillsDir = path.join(targetDir, '.opencode', 'skills');
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  const files = [];

  // Main agent file
  const agentContent = `# Kracked_Skills Agent (KD) — OpenCode Agent

Read and follow the system prompt at: {project-root}/.kracked/prompts/system-prompt.md

## Available Commands
${commands.map(cmd => `- \`/${cmd.name}\` — ${cmd.description}`).join('\n')}

## How to Process Commands
When the user types any /kd-* command:
1. Load the corresponding workflow file from {project-root}/.kracked/workflows/
2. Follow all instructions exactly as written
3. Update {project-root}/KD_output/status/status.md after every response
`;

  fs.writeFileSync(path.join(agentsDir, 'kracked-skills.md'), agentContent, 'utf8');
  files.push('.opencode/agents/kracked-skills.md');

  return files;
}

function generateKiloCodeAdapter(targetDir, commands) {
  const dir = path.join(targetDir, '.kilocode', 'workflows');
  fs.mkdirSync(dir, { recursive: true });

  const files = [];

  commands.forEach(cmd => {
    const content = generateCommandMarkdown(cmd, 'kilocode');
    const filename = `${cmd.name}.md`;
    fs.writeFileSync(path.join(dir, filename), content, 'utf8');
    files.push(`.kilocode/workflows/${filename}`);
  });

  // Generate .kilocodemodes file
  const modesContent = `customModes:
  - slug: kd-agent-amad
    name: ⚡ KD Agent Amad
    roleDefinition: You are Amad, the master agent of Kracked_Skills Agent (KD) system — an AI multi-agent system for professional software development.
    whenToUse: Use for all KD-related tasks and commands
    customInstructions: |
      You must fully embody this agent's persona and follow all activation instructions exactly as specified.
      Read the full system prompt from {project-root}/.kracked/prompts/system-prompt.md
      Follow all activation steps. Stay in character until told to exit this mode.
    groups:
      - read
      - edit
      - browser
      - command
      - mcp
`;

  fs.writeFileSync(path.join(targetDir, '.kilocodemodes'), modesContent, 'utf8');
  files.push('.kilocodemodes');

  return files;
}

function generateClineAdapter(targetDir, commands) {
  const dir = path.join(targetDir, '.clinerules', 'workflows');
  fs.mkdirSync(dir, { recursive: true });

  const files = [];

  commands.forEach(cmd => {
    const content = generateCommandMarkdown(cmd, 'cline');
    const filename = `${cmd.name}.md`;
    fs.writeFileSync(path.join(dir, filename), content, 'utf8');
    files.push(`.clinerules/workflows/${filename}`);
  });

  return files;
}

function generateIDEConfig(targetDir, ide) {
  const configDir = path.join(targetDir, '.kracked', '_config', 'ides');
  fs.mkdirSync(configDir, { recursive: true });

  const config = {
    ide: ide,
    configured_date: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    configuration: {
      _noConfigNeeded: true,
    },
  };

  const yaml = `ide: ${config.ide}
configured_date: ${config.configured_date}
last_updated: ${config.last_updated}
configuration:
  _noConfigNeeded: true
`;

  fs.writeFileSync(path.join(configDir, `${ide}.yaml`), yaml, 'utf8');
}

module.exports = {
  SUPPORTED_IDES,
  generateAdapter,
  generateIDEConfig,
  getCommandFiles,
};
