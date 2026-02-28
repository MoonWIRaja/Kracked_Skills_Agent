/**
 * Adapter Generator for Kracked_Skills Agent
 * Generates IDE-specific adapter files for 7 supported tools
 *
 * Supported IDEs:
 *   - codex       â†’ .codex/INSTRUCTIONS.md
 *   - antigravity â†’ .agent/workflows/ + .agents/skills/
 *   - cursor      â†’ .cursor/commands/
 *   - opencode    â†’ .opencode/agents/ + .opencode/skills/
 *   - kilocode    â†’ .kilocode/workflows/ + .kilocodemodes
 *   - cline       â†’ .clinerules/workflows/
 *   - claude-code â†’ CLAUDE.md + .claude/commands/
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED_IDES = ['codex', 'antigravity', 'cursor', 'opencode', 'kilocode', 'cline', 'claude-code'];
const LEGACY_AGENT_NAMES = {
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

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceWholeWord(text, from, to) {
  if (!from || !to || from === to) return text;
  return text.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, 'g'), to);
}

function personalizeCommands(commands, context = {}) {
  const mainAgentName = context.mainAgentName || LEGACY_AGENT_NAMES.main;
  const roster = context.roster && context.roster.byRole ? context.roster.byRole : {};
  const replacements = new Map([
    [LEGACY_AGENT_NAMES.main, mainAgentName],
    [LEGACY_AGENT_NAMES.analyst, roster.analyst],
    [LEGACY_AGENT_NAMES.pm, roster.pm],
    [LEGACY_AGENT_NAMES.architect, roster.architect],
    [LEGACY_AGENT_NAMES['tech-lead'], roster['tech-lead']],
    [LEGACY_AGENT_NAMES.engineer, roster.engineer],
    [LEGACY_AGENT_NAMES.qa, roster.qa],
    [LEGACY_AGENT_NAMES.security, roster.security],
    [LEGACY_AGENT_NAMES.devops, roster.devops],
    [LEGACY_AGENT_NAMES['release-manager'], roster['release-manager']],
  ]);

  return commands.map((command) => {
    let description = command.description;
    for (const [from, to] of replacements.entries()) {
      description = replaceWholeWord(description, from, to);
    }
    return { ...command, description };
  });
}

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
      description: 'Smart guidance â€” tells you what to do next based on current project state. Can combine with questions.',
      taskRef: '{project-root}/.kracked/workflows/KD-help.md',
    },
    {
      name: 'kd-status',
      description: 'Display current project status from status.md â€” stage, progress, recent work, and next steps.',
      taskRef: '{project-root}/.kracked/workflows/KD-status.md',
    },
    {
      name: 'kd-analyze',
      description: '[ANALYST] Start Discovery phase â€” Scale Assessment, risk analysis, and stakeholder identification.',
      taskRef: '{project-root}/.kracked/workflows/KD-analyze.md',
    },
    {
      name: 'kd-brainstorm',
      description: '[ANALYST+PM] Brainstorming session â€” generate 3-5 approaches with scoring and consensus.',
      taskRef: '{project-root}/.kracked/workflows/KD-brainstorm.md',
    },
    {
      name: 'kd-prd',
      description: '[PM] Generate full PRD â€” personas, metrics, risks, acceptance criteria.',
      taskRef: '{project-root}/.kracked/workflows/KD-prd.md',
    },
    {
      name: 'kd-arch',
      description: '[ARCH+SEC] Architecture design â€” tech stack, system diagrams, API design, security review.',
      taskRef: '{project-root}/.kracked/workflows/KD-arch.md',
    },
    {
      name: 'kd-story',
      description: '[TL] Break epic into user stories with acceptance criteria.',
      taskRef: '{project-root}/.kracked/workflows/KD-story.md',
    },
    {
      name: 'kd-dev-story',
      description: '[ENG] Implement a user story using TDD approach â€” tests first, then code.',
      taskRef: '{project-root}/.kracked/workflows/KD-dev-story.md',
    },
    {
      name: 'kd-code-review',
      description: '[QA+SEC] Systematic code review â€” quality, security, test coverage.',
      taskRef: '{project-root}/.kracked/workflows/KD-code-review.md',
    },
    {
      name: 'kd-deploy',
      description: '[DEVOPS] Generate deployment plan â€” CI/CD, preflight check, rollback plan.',
      taskRef: '{project-root}/.kracked/workflows/KD-deploy.md',
    },
    {
      name: 'kd-release',
      description: '[RM] Create release notes, update changelog, sync knowledge to global memory.',
      taskRef: '{project-root}/.kracked/workflows/KD-release.md',
    },
    {
      name: 'kd-sprint-planning',
      description: 'Initialize sprint tracking â€” select stories, set goals, assign to agents.',
      taskRef: '{project-root}/.kracked/workflows/KD-sprint-planning.md',
    },
    {
      name: 'kd-sprint-review',
      description: 'Review current sprint progress â€” completed stories, remaining work.',
      taskRef: '{project-root}/.kracked/workflows/KD-sprint-review.md',
    },
    {
      name: 'kd-retrospective',
      description: 'Run retrospective â€” what went well, what needs improvement, action items.',
      taskRef: '{project-root}/.kracked/workflows/KD-retrospective.md',
    },
    {
      name: 'kd-refactor',
      description: '[TL+ENG] Guided refactoring with tech lead oversight.',
      taskRef: '{project-root}/.kracked/workflows/KD-refactor.md',
    },
    {
      name: 'kd-validate',
      description: 'Validate that output meets requirements â€” run validation block.',
      taskRef: '{project-root}/.kracked/workflows/KD-validate.md',
    },
    {
      name: 'kd-role-analyst',
      description: 'Activate full Analyst mode â€” become [ANALYST] Ara for deep analysis.',
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
      description: '[QA] Generate test suite for current code â€” unit, integration, e2e.',
      taskRef: '{project-root}/.kracked/workflows/KD-test.md',
    },
    {
      name: 'kd-security-audit',
      description: '[SEC] Full security audit â€” OWASP Top 10, dependency check, with XP reward.',
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
Also load main agent profile from: {project-root}/.kracked/config/main-agent.json
Also load observer schema from: {project-root}/.kracked/runtime/SCHEMA.md

After completing the response, log one observer event using:
\`node {project-root}/.kracked/runtime/emit-event.js --source ${ideType} --agent-id main-agent --agent-name "<agent_name>" --role "Master Agent" --action typing --task ${cmd.name} --message "Workflow completed"\`
`;
}

/**
 * Generate adapter files for a specific IDE
 */
function generateAdapter(targetDir, ide, context = {}) {
  const commands = personalizeCommands(getCommandFiles(), context);
  const mainAgentName = context.mainAgentName || 'Amad';

  switch (ide) {
    case 'codex':
      return generateCodexAdapter(targetDir, commands, mainAgentName);
    case 'antigravity':
      return generateAntigravityAdapter(targetDir, commands);
    case 'cursor':
      return generateCursorAdapter(targetDir, commands);
    case 'opencode':
      return generateOpenCodeAdapter(targetDir, commands, mainAgentName);
    case 'kilocode':
      return generateKiloCodeAdapter(targetDir, commands, mainAgentName);
    case 'cline':
      return generateClineAdapter(targetDir, commands);
    case 'claude':
    case 'claude-code':
      return generateClaudeCodeAdapter(targetDir, commands, mainAgentName);
    default:
      throw new Error(`Unsupported IDE: ${ide}`);
  }
}

function generateCodexAdapter(targetDir, commands, mainAgentName = 'Amad') {
  const dir = path.join(targetDir, '.codex');
  const cmdDir = path.join(dir, 'commands');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(cmdDir, { recursive: true });

  // Codex uses INSTRUCTIONS.md as main entry point
  const instructions = `# Kracked_Skills Agent (KD) â€” Codex Adapter

You are integrated with the Kracked_Skills Agent (KD) system.
Main agent for this installation: ${mainAgentName}

## Activation
Read and follow:
- System prompt: {project-root}/.kracked/prompts/system-prompt.md
- Main agent profile: {project-root}/.kracked/config/main-agent.json

## Available Commands
${commands.map(cmd => `- \`/${cmd.name}\` â€” ${cmd.description}`).join('\n')}

## How to Process Commands
When the user types any /kd-* command:
1. Load the corresponding workflow file from {project-root}/.kracked/workflows/
2. Load the system prompt from {project-root}/.kracked/prompts/system-prompt.md
3. Follow all instructions exactly as written in the workflow file
4. Update {project-root}/KD_output/status/status.md after every response
`;

  fs.writeFileSync(path.join(dir, 'INSTRUCTIONS.md'), instructions, 'utf8');

  const files = ['.codex/INSTRUCTIONS.md'];
  commands.forEach(cmd => {
    const content = generateCommandMarkdown(cmd, 'codex');
    const filename = `${cmd.name}.md`;
    fs.writeFileSync(path.join(cmdDir, filename), content, 'utf8');
    files.push(`.codex/commands/${filename}`);
  });

  return files;
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
  const agSkillDir = path.join(skillsDir, 'kracked-skills-agent');
  fs.mkdirSync(agSkillDir, { recursive: true });

  const skillContent = `---
name: 'kracked-skills-agent'
description: 'KD Multi-Agent System â€” 9 specialized agents, 8 structured stages, XP leveling'
---

# Kracked_Skills Agent (KD)

Read and follow the system prompt at: {project-root}/.kracked/prompts/system-prompt.md

This skill provides a complete AI multi-agent development system with:
- 9 specialized agent roles (Analyst, PM, Architect, Tech Lead, Engineer, QA, Security, DevOps, Release Manager)
- 8 structured development stages (Discovery â†’ Release)
- XP leveling system (Novice â†’ Grandmaster)
- Session memory that persists across conversations
- Scale-adaptive workflows (SMALL/STANDARD/DEEP)
- Shared observer event logging at {project-root}/.kracked/runtime/events.jsonl

For every completed workflow response, emit one event:
\`node {project-root}/.kracked/runtime/emit-event.js --source antigravity --agent-id main-agent --agent-name "<agent_name>" --role "Master Agent" --action typing --task "<kd-command>"\`
`;

  fs.writeFileSync(path.join(agSkillDir, 'SKILL.md'), skillContent, 'utf8');
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

function generateOpenCodeAdapter(targetDir, commands, mainAgentName = 'Amad') {
  const agentsDir = path.join(targetDir, '.opencode', 'agents');
  const skillsDir = path.join(targetDir, '.opencode', 'skills');
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  const files = [];

  // Main agent file
  const agentContent = `# Kracked_Skills Agent (KD) â€” OpenCode Agent

Read and follow the system prompt at: {project-root}/.kracked/prompts/system-prompt.md
Main agent persona: ${mainAgentName}

## Available Commands
${commands.map(cmd => `- \`/${cmd.name}\` â€” ${cmd.description}`).join('\n')}

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

function generateKiloCodeAdapter(targetDir, commands, mainAgentName = 'Amad') {
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
  const agentSlug = toSlug(mainAgentName) || 'main-agent';
  const modesContent = `customModes:
  - slug: kd-agent-${agentSlug}
    name: âš¡ KD Agent ${mainAgentName}
    roleDefinition: You are ${mainAgentName}, the master agent of Kracked_Skills Agent (KD) system â€” an AI multi-agent system for professional software development.
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

function generateClaudeCodeAdapter(targetDir, commands, mainAgentName = 'Amad') {
  const commandsDir = path.join(targetDir, '.claude', 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });

  const files = [];
  const claudeContent = `# Kracked_Skills Agent (KD) - Claude Code Adapter

You are integrated with the Kracked_Skills Agent (KD) system.
Main agent for this installation: ${mainAgentName}

## Activation
Read and follow:
- System prompt: {project-root}/.kracked/prompts/system-prompt.md
- Main agent profile: {project-root}/.kracked/config/main-agent.json

## Available Commands
${commands.map((cmd) => `- \`/${cmd.name}\` - ${cmd.description}`).join('\n')}

## Command Handling
When the user runs a /kd-* command:
1. Load corresponding workflow from {project-root}/.kracked/workflows/
2. Follow workflow instructions exactly
3. Update {project-root}/KD_output/status/status.md after each response
`;

  fs.writeFileSync(path.join(targetDir, 'CLAUDE.md'), claudeContent, 'utf8');
  files.push('CLAUDE.md');

  commands.forEach((cmd) => {
    const content = generateCommandMarkdown(cmd, 'claude-code');
    const filename = `${cmd.name}.md`;
    fs.writeFileSync(path.join(commandsDir, filename), content, 'utf8');
    files.push(`.claude/commands/${filename}`);
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
