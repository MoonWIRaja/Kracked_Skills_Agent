---
name: 'kd-test'
description: '[QA] Generate test suite for current code'
---
# /kd-test
## Agent: [QA] Qila
Load: `{project-root}/.kracked/agents/qa.md`
Load skill: `{project-root}/.kracked/skills/testing/SKILL.md`
## Instructions
1. Analyze code under test
2. Generate unit, integration, and e2e tests
3. Aim for ≥80% coverage
4. Follow TDD patterns from testing skill
