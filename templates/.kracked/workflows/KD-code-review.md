# `/kd-code-review`

## Purpose
Semakan kualiti dan risiko sebelum validation/deploy.

## Skills To Load
- `agent-dialogue`
- `security`
- `testing`
- `learning-xp`

## Required Agents
- main-agent
- qa
- security
- architect

## Required Actions
1. Findings mesti datang dahulu dan disusun ikut severity.
2. Sertakan review transcript antara QA, Security, dan Architect jika relevan.
3. Gunakan `checklists/code-review-checklist.md` sebagai baseline.
4. Tulis output ke `KD_output/code-review/code-review.md`.

## Footer
```text
Next command: /kd-validate
XP updated: +55
Learning bonus: +10 / none
Memory updated: yes
Artifacts written: [KD_output/code-review/code-review.md, KD_output/transcripts/<timestamp>-kd-code-review.md]
Agents consulted: [main-agent, qa, security, architect]
```
