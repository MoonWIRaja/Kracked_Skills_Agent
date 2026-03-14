# `/kd-validate`

## Purpose
Semak sama ada implementation memenuhi PRD, architecture, dan acceptance criteria.

## Skills To Load
- `agent-dialogue`
- `learning-xp`

## Required Agents
- main-agent
- pm
- qa

## Required Actions
1. Bandingkan output implementation dengan requirement penting.
2. Hasilkan validation matrix.
3. Terangkan gap yang tinggal.
4. Tulis output ke `KD_output/validation/validation.md`.

## Footer
```text
Next command: /kd-deploy
XP updated: +45
Learning bonus: +5 / none
Memory updated: yes
Artifacts written: [KD_output/validation/validation.md, KD_output/transcripts/<timestamp>-kd-validate.md]
Agents consulted: [main-agent, pm, qa]
```
