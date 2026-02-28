---
name: 'KD'
description: 'Show KD interactive command menu with all available commands and agents'
---

# /KD — Command Menu

## Instructions
1. Load system prompt from: `{project-root}/.kracked/prompts/system-prompt.md`
2. Load project status from: `{project-root}/KD_output/status/status.md`
3. Load config from: `{project-root}/.kracked/config/settings.json`
4. Display the following menu:

```
⚡ KRACKED_SKILLS AGENT (KD) — Command Menu

📍 Current Stage: [Read from status.md]
📊 Level: [Read from xp.json]

── Setup & Navigation ──────────────────
  /kd            Show this menu
  /kd-new        Initialize new project
  /kd-kickoff    Resume existing project  
  /kd-help       Smart guidance
  /kd-status     Show project status

── Core Flow ───────────────────────────
  /kd-analyze      [ANALYST] Discovery & Scale Assessment
  /kd-brainstorm   [ANALYST+PM] Solution brainstorming
  /kd-prd          [PM] Generate full PRD
  /kd-arch         [ARCH+SEC] Architecture design
  /kd-story        [TL] Break epic into stories
  /kd-dev-story    [ENG] Implement story (TDD)
  /kd-code-review  [QA+SEC] Code review
  /kd-deploy       [DEVOPS] Deployment plan
  /kd-release      [RM] Release notes

── Agile & Execution ───────────────────
  /kd-sprint-planning   Initialize sprint
  /kd-sprint-review     Review sprint
  /kd-retrospective     Run retrospective
  /kd-refactor          Guided refactoring
  /kd-validate          Validate output

── Specialist ──────────────────────────
  /kd-api-design        REST/GraphQL design
  /kd-db-schema         Database schema
  /kd-test              Generate test suite
  /kd-security-audit    Full security audit

Type a command or describe what you need.
KD finishes what it starts. ⚡
```

5. Wait for user input
6. Match user input to command or use natural language understanding
7. Execute matched workflow
