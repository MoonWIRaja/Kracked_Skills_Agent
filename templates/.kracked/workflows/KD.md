# `/kd`

## Purpose
Paparkan command hub rasmi KD dan flow yang disyorkan.

## Required Actions
1. Terangkan bahawa user biasanya bercakap dengan main agent.
2. Nyatakan user boleh bercakap terus dengan sub-agent menggunakan `@Name`.
3. Paparkan flow command rasmi:
   - `/kd-analyze`
   - `/kd-brainstorm`
   - `/kd-prd`
   - `/kd-arch`
   - `/kd-story`
   - `/kd-sprint-planning`
   - `/kd-dev-story`
   - `/kd-test`
   - `/kd-code-review`
   - `/kd-validate`
   - `/kd-deploy`
   - `/kd-release`
4. Sertakan command bantuan:
   - `/kd-help`
   - `/kd-status`
   - `/kd-roster`
   - `/kd-refactor`
   - `/kd-sprint-review`
   - `/kd-retrospective`
5. Sertakan specialist commands:
   - `/kd-api-design`
   - `/kd-db-schema`
   - `/kd-security-audit`
6. Nyatakan compatibility:
   - `/kd-new` -> `/kd-analyze`
   - `/kd-role-analyst` -> `@<analyst-name>` atau `/kd-roster`

## Output Contract
- Scene Header
- Decision Summary
- Next Action Footer

## Footer
```text
Next command: /kd-analyze
XP updated: +5
Learning bonus: none
Memory updated: no
Artifacts written: [none]
Agents consulted: [main-agent]
```
