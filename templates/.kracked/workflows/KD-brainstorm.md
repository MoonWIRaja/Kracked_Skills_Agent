# `/kd-brainstorm`

## Purpose
Sesi discovery dan roundtable design secara hidup bersama user.

## Skills To Load
- `brainstorm-interview`
- `agent-dialogue`
- `ui-ux-frontend`
- `backend-api`
- `learning-xp`

## Required Agents
- main-agent
- analyst
- pm
- ui-ux-frontend
- backend-api
- architect
- security
- devops

## Required Actions
1. Mulakan scene dan perkenalkan agent yang relevan.
2. Tanyakan soalan secara berperingkat kepada user.
3. Setiap soalan mesti ada:
   - siapa yang bertanya
   - sebab soalan itu penting
   - recommended answer
   - pilihan custom answer
4. Wajib cover:
   - tujuan projek
   - target user
   - UI theme/style/colors/layout
   - screens/pages
   - backend boundary
   - API endpoints
   - stack
   - database
   - environments
   - auth
   - integrations
   - deployment
   - testing strategy
   - risks/constraints
5. Selepas user jawab, semua agent berbincang semula dalam transcript.
6. Tulis keputusan muktamad yang lengkap.
7. Sertakan:
   - product summary
   - agent roundtable transcript
   - frontend direction
   - backend/API direction
   - DB and infra direction
   - Mermaid workflow
   - Mermaid architecture
   - ASCII wireframe
   - screen list
   - endpoint draft
   - data model draft
8. Tulis output ke `KD_output/brainstorm/brainstorm.md`.

## Footer
```text
Next command: /kd-prd
XP updated: +75
Learning bonus: +15 / none
Memory updated: yes
Artifacts written: [KD_output/brainstorm/brainstorm.md, KD_output/transcripts/<timestamp>-kd-brainstorm.md]
Agents consulted: [main-agent, analyst, pm, ui-ux-frontend, backend-api, architect, security, devops]
```
