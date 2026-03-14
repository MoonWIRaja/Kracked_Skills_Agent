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
  return commands.map((command) => ({ ...command }));
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
      description: 'Deprecated alias to /kd-analyze. Starts the official project entry workflow and points the user to the modern flow.',
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
      name: 'kd-roster',
      description: 'Show the full main-agent and sub-agent roster, roles, and valid @mention handles for direct chat.',
      taskRef: '{project-root}/.kracked/workflows/KD-roster.md',
    },
    {
      name: 'kd-analyze',
      description: '[MAIN+ANALYST] Official entry command â€” scan the current project, explain what exists, and route to /kd-brainstorm.',
      taskRef: '{project-root}/.kracked/workflows/KD-analyze.md',
    },
    {
      name: 'kd-brainstorm',
      description: '[MAIN+ROUNDTABLE] Live discovery interview â€” user Q&A, sub-agent discussion, and detailed brainstorm artifacts.',
      taskRef: '{project-root}/.kracked/workflows/KD-brainstorm.md',
    },
    {
      name: 'kd-prd',
      description: '[PM+MAIN] Generate a formal PRD with agent transcript, scope, metrics, acceptance criteria, and traceability.',
      taskRef: '{project-root}/.kracked/workflows/KD-prd.md',
    },
    {
      name: 'kd-arch',
      description: '[ARCH+UI+API+SEC+DEVOPS] Architecture roundtable â€” tech stack, system diagrams, API design, security, deployment.',
      taskRef: '{project-root}/.kracked/workflows/KD-arch.md',
    },
    {
      name: 'kd-story',
      description: '[TL+PM] Break architecture into epics and user stories with acceptance criteria and execution order.',
      taskRef: '{project-root}/.kracked/workflows/KD-story.md',
    },
    {
      name: 'kd-sprint-planning',
      description: '[PM+TL] Build sprint plan â€” select stories, set priorities, dependencies, owners, and next execution order.',
      taskRef: '{project-root}/.kracked/workflows/KD-sprint-planning.md',
    },
    {
      name: 'kd-dev-story',
      description: '[ENG+MAIN] Implement a selected user story with transcript logging, artifacts, and TDD-first delivery.',
      taskRef: '{project-root}/.kracked/workflows/KD-dev-story.md',
    },
    {
      name: 'kd-test',
      description: '[QA] Generate and evaluate the current test suite â€” unit, integration, e2e, and coverage gaps.',
      taskRef: '{project-root}/.kracked/workflows/KD-test.md',
    },
    {
      name: 'kd-refactor',
      description: '[TL+ENG] Guided refactoring with tech lead oversight, quality goals, and a return path to testing.',
      taskRef: '{project-root}/.kracked/workflows/KD-refactor.md',
    },
    {
      name: 'kd-code-review',
      description: '[QA+SEC+ARCH] Systematic code review â€” quality, security, architecture fit, and test coverage.',
      taskRef: '{project-root}/.kracked/workflows/KD-code-review.md',
    },
    {
      name: 'kd-validate',
      description: '[PM+QA] Validate the implementation against requirements, acceptance criteria, and expected outputs.',
      taskRef: '{project-root}/.kracked/workflows/KD-validate.md',
    },
    {
      name: 'kd-deploy',
      description: '[DEVOPS+SEC] Generate deployment plan â€” CI/CD, preflight, rollback plan, and operational risks.',
      taskRef: '{project-root}/.kracked/workflows/KD-deploy.md',
    },
    {
      name: 'kd-release',
      description: '[RM] Create release notes, update changelog, sync knowledge, and hand off to review/retro flow.',
      taskRef: '{project-root}/.kracked/workflows/KD-release.md',
    },
    {
      name: 'kd-sprint-review',
      description: '[PM+TL] Review current sprint progress â€” completed stories, demos, and remaining work.',
      taskRef: '{project-root}/.kracked/workflows/KD-sprint-review.md',
    },
    {
      name: 'kd-role-analyst',
      description: 'Compatibility shim for legacy Analyst mode â€” redirect users to @<analyst-name> or /kd-roster.',
      taskRef: '{project-root}/.kracked/workflows/KD-role-analyst.md',
    },
    {
      name: 'kd-api-design',
      description: '[BACKEND-API+ARCH] Design REST/GraphQL endpoints, contracts, auth, and service boundaries.',
      taskRef: '{project-root}/.kracked/workflows/KD-api-design.md',
    },
    {
      name: 'kd-security-audit',
      description: '[SEC] Full security audit â€” OWASP Top 10, dependency check, with XP reward.',
      taskRef: '{project-root}/.kracked/workflows/KD-security-audit.md',
    },
    {
      name: 'kd-db-schema',
      description: '[BACKEND-API+ARCH] Generate and optimize database schema design, relationships, and environment strategy.',
      taskRef: '{project-root}/.kracked/workflows/KD-db-schema.md',
    },
    {
      name: 'kd-retrospective',
      description: '[MAIN+ROUNDTABLE] Run retrospective â€” what went well, what needs improvement, and action items.',
      taskRef: '{project-root}/.kracked/workflows/KD-retrospective.md',
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
Also load agent roster from: {project-root}/.kracked/config/agents.json
Also load language settings from: {project-root}/.kracked/config/settings.json
Also load observer schema from: {project-root}/.kracked/runtime/SCHEMA.md
Also write human transcript artifacts to: {project-root}/KD_output/transcripts/

Language enforcement:
- All planning, chat, explanations, summaries, transcripts, and document prose MUST use the language chosen in settings.json
- Code, code comments, identifiers, test names, and code examples MUST stay in English unless the user explicitly requests another language

After completing the response, log one observer event using:
\`node {project-root}/.kracked/runtime/emit-event.js --source ${ideType} --agent-id main-agent --agent-name "<agent_name>" --role "Master Agent" --action typing --task ${cmd.name} --message "Workflow completed"\`

If Main Agent delegates to professional agent(s), include target on the same log:
\`node {project-root}/.kracked/runtime/emit-event.js --source ${ideType} --agent-id main-agent --agent-name "<agent_name>" --role "Master Agent" --action typing --task ${cmd.name} --target-agent-id "<role>-agent" --message "Delegating subtask"\`

Also append at least one dialogue transcript entry using:
\`node {project-root}/.kracked/runtime/emit-transcript.js --command ${cmd.name} --speaker-id main-agent --speaker-name "<agent_name>" --speaker-role "Master Agent" --message-kind summary --text "Workflow completed"\`
`;
}

/**
 * Generate adapter files for a specific IDE
 */
function generateAdapter(targetDir, ide, context = {}) {
  const commands = personalizeCommands(getCommandFiles(), context);
  const mainAgentName = context.mainAgentName || 'Main Agent';

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

function generateCodexAdapter(targetDir, commands, mainAgentName = 'Main Agent') {
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
- Agent roster: {project-root}/.kracked/config/agents.json
- Settings: {project-root}/.kracked/config/settings.json

## Available Commands
${commands.map(cmd => `- \`/${cmd.name}\` â€” ${cmd.description}`).join('\n')}

## How to Process Commands
When the user types any /kd-* command:
1. Load the corresponding workflow file from {project-root}/.kracked/workflows/
2. Load the system prompt from {project-root}/.kracked/prompts/system-prompt.md
3. Load the persistent roster from {project-root}/.kracked/config/agents.json and honor valid @Name mentions
4. Enforce the selected project language for planning/chat/explanations from settings.json
5. Keep code, code comments, identifiers, and code examples in English unless the user explicitly requests another language
6. Follow all instructions exactly as written in the workflow file
7. Update {project-root}/KD_output/status/status.md after every response
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
description: 'KD Multi-Agent System â€” main agent plus 11 specialist sub-agents, structured workflow stages, transcripts, and XP leveling'
---

# Kracked_Skills Agent (KD)

Read and follow the system prompt at: {project-root}/.kracked/prompts/system-prompt.md
Read the persistent roster at: {project-root}/.kracked/config/agents.json
Read language settings at: {project-root}/.kracked/config/settings.json

This skill provides a complete AI multi-agent development system with:
- 1 main agent orchestrator plus 11 specialized sub-agent roles
- Structured workflow stages from /kd-analyze to /kd-retrospective
- XP leveling system (Novice â†’ Grandmaster)
- Session memory that persists across conversations
- Scale-adaptive workflows (SMALL/STANDARD/DEEP)
- Shared observer event logging at {project-root}/.kracked/runtime/events.jsonl
- Shared dialogue transcript logging at {project-root}/.kracked/runtime/transcripts.jsonl
- Direct specialist access using valid @Name mentions from the roster
- Planning/chat/explanations must use the selected project language from settings.json
- Code and code comments stay in English unless the user explicitly requests another language

For every completed workflow response, emit one event:
\`node {project-root}/.kracked/runtime/emit-event.js --source antigravity --agent-id main-agent --agent-name "<agent_name>" --role "Master Agent" --action typing --task "<kd-command>"\`

If delegating to specialist role, include:
\`--target-agent-id "<role>-agent"\`

Also append one transcript line:
\`node {project-root}/.kracked/runtime/emit-transcript.js --command "<kd-command>" --speaker-id main-agent --speaker-name "<agent_name>" --speaker-role "Master Agent" --message-kind summary --text "Workflow completed"\`
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

function generateOpenCodeAdapter(targetDir, commands, mainAgentName = 'Main Agent') {
  const agentsDir = path.join(targetDir, '.opencode', 'agents');
  const skillsDir = path.join(targetDir, '.opencode', 'skills');
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  const files = [];

  // Main agent file
  const agentContent = `# Kracked_Skills Agent (KD) â€” OpenCode Agent

Read and follow the system prompt at: {project-root}/.kracked/prompts/system-prompt.md
Main agent persona: ${mainAgentName}
Persistent roster: {project-root}/.kracked/config/agents.json
Language settings: {project-root}/.kracked/config/settings.json

## Available Commands
${commands.map(cmd => `- \`/${cmd.name}\` â€” ${cmd.description}`).join('\n')}

## How to Process Commands
When the user types any /kd-* command:
1. Load the corresponding workflow file from {project-root}/.kracked/workflows/
2. Load the roster from {project-root}/.kracked/config/agents.json and respect valid @Name mentions
3. Use the selected project language from settings.json for planning/chat/explanations
4. Keep code and code comments in English unless the user explicitly requests another language
5. Follow all instructions exactly as written
6. Update {project-root}/KD_output/status/status.md after every response
`;

  fs.writeFileSync(path.join(agentsDir, 'kracked-skills.md'), agentContent, 'utf8');
  files.push('.opencode/agents/kracked-skills.md');

  return files;
}

function generateKiloCodeAdapter(targetDir, commands, mainAgentName = 'Main Agent') {
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

function generateClaudeCodeAdapter(targetDir, commands, mainAgentName = 'Main Agent') {
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
- Agent roster: {project-root}/.kracked/config/agents.json
- Settings: {project-root}/.kracked/config/settings.json

## Available Commands
${commands.map((cmd) => `- \`/${cmd.name}\` - ${cmd.description}`).join('\n')}

## Command Handling
When the user runs a /kd-* command:
1. Load corresponding workflow from {project-root}/.kracked/workflows/
2. Load the persistent roster from {project-root}/.kracked/config/agents.json and honor valid @Name mentions
3. Use the selected project language from settings.json for planning/chat/explanations
4. Keep code and code comments in English unless the user explicitly requests another language
5. Follow workflow instructions exactly
6. Update {project-root}/KD_output/status/status.md after each response
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
