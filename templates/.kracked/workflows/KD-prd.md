# `/kd-prd`

## Purpose
Tukar keputusan brainstorm menjadi PRD formal yang boleh dilaksanakan.

## Skills To Load
- `agent-dialogue`
- `learning-xp`

## Required Agents
- main-agent
- pm
- analyst

## Required Actions
1. Baca hasil brainstorm.
2. Paparkan dialog pendek antara main agent, PM, dan analyst sebelum dokumen final.
3. Hasilkan:
   - problem statement
   - target users/personas
   - MVP scope
   - out-of-scope
   - KPIs
   - acceptance criteria
   - dependencies
   - risks
   - traceability kepada brainstorm
4. Sertakan visual ringkas jika membantu.
5. Tulis output ke `KD_output/PRD/prd.md`.

## Footer
```text
Next command: /kd-arch
XP updated: +60
Learning bonus: +10 / none
Memory updated: yes
Artifacts written: [KD_output/PRD/prd.md, KD_output/transcripts/<timestamp>-kd-prd.md]
Agents consulted: [main-agent, pm, analyst]
```
