# `/kd-analyze`

## Purpose
Titik mula rasmi semua projek KD.

## Skills To Load
- `project-reverse-analysis`
- `agent-dialogue`
- `learning-xp`

## Required Agents
- main-agent
- analyst
- ui-ux-frontend
- backend-api

## Required Actions
1. Scan project semasa dengan exclusion rules dari system prompt.
2. Kenal pasti sama ada repo kosong atau mempunyai codebase sebenar.
3. Jalankan transcript dialog minimum:
   - main agent membuka scene
   - analyst menerangkan approach scan
   - ui-ux-frontend memberi bacaan frontend/UX jika ada
   - backend-api memberi bacaan backend/API/data jika ada
   - main agent merumuskan
4. Jika repo kosong:
   - hasilkan empty-project analysis
   - nyatakan tiada aplikasi sedia ada
   - terangkan apa yang perlu dijawab dalam brainstorm
5. Jika repo ada kandungan:
   - terangkan repo structure
   - frontend screens/components/theme
   - backend routes/services/models
   - DB/schema/integration/auth
   - test coverage dan gaps
   - infra/deploy/env assumptions
   - risk/gap/tech debt
6. Sertakan:
   - Mermaid flow
   - ASCII wireframe
   - visual decomposition
7. Tulis output ke `KD_output/discovery/discovery.md`.
8. Kemas kini status, transcript artifact, memory jika ada pembelajaran penting.

## Output Contract
- Scene Header
- Agent Transcript
- Decision Summary
- Detailed Artifacts
- Project State Update
- Next Action Footer

## Footer
```text
Next command: /kd-brainstorm
XP updated: +50
Learning bonus: +10 / none
Memory updated: yes
Artifacts written: [KD_output/discovery/discovery.md, KD_output/transcripts/<timestamp>-kd-analyze.md]
Agents consulted: [main-agent, analyst, ui-ux-frontend, backend-api]
```
