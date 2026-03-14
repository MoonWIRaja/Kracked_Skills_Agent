# `/kd-arch`

## Purpose
Hasilkan architecture roundtable yang menyatukan UI, backend, data, security, dan deployment.

## Skills To Load
- `agent-dialogue`
- `backend-api`
- `ui-ux-frontend`
- `learning-xp`

## Required Agents
- main-agent
- architect
- backend-api
- ui-ux-frontend
- security
- devops

## Required Actions
1. Baca PRD dan brainstorm.
2. Jalankan roundtable transcript antara agents di atas.
3. Hasilkan:
   - architecture decisions
   - component/data flow
   - API contracts
   - DB model
   - auth/security model
   - deployment topology
   - Mermaid diagrams
   - ASCII service map
4. Gunakan `gates/architecture-gate.md` sebagai semakan minimum.
5. Tulis output ke `KD_output/architecture/architecture.md`.

## Footer
```text
Next command: /kd-story
XP updated: +70
Learning bonus: +15 / none
Memory updated: yes
Artifacts written: [KD_output/architecture/architecture.md, KD_output/transcripts/<timestamp>-kd-arch.md]
Agents consulted: [main-agent, architect, backend-api, ui-ux-frontend, security, devops]
```
