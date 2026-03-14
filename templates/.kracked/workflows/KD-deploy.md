# `/kd-deploy`

## Purpose
Sediakan deployment plan dengan preflight, rollback, dan operational checks.

## Skills To Load
- `devops`
- `security`
- `agent-dialogue`
- `learning-xp`

## Required Agents
- main-agent
- devops
- security

## Required Actions
1. Gunakan `checklists/preflight-check.md`.
2. Nyatakan:
   - target environment
   - release gating
   - rollback plan
   - monitoring
   - operational risks
3. Tulis output ke `KD_output/deployment/deployment-plan.md`.

## Footer
```text
Next command: /kd-release
XP updated: +60
Learning bonus: +10 / none
Memory updated: yes
Artifacts written: [KD_output/deployment/deployment-plan.md, KD_output/transcripts/<timestamp>-kd-deploy.md]
Agents consulted: [main-agent, devops, security]
```
