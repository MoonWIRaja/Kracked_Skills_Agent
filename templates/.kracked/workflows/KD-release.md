# `/kd-release`

## Purpose
Tutup cycle release dengan release notes, changelog summary, dan next operational handoff.

## Skills To Load
- `agent-dialogue`
- `learning-xp`

## Required Agents
- main-agent
- release-manager
- devops

## Required Actions
1. Ringkaskan apa yang berubah.
2. Tulis release notes dan deployment watch items.
3. Nyatakan sama ada next step lebih sesuai:
   - `/kd-sprint-review`
   - atau `/kd-retrospective`
4. Tulis output ke `KD_output/release/release-notes.md`.

## Footer
```text
Next command: /kd-sprint-review
XP updated: +45
Learning bonus: +5 / none
Memory updated: yes
Artifacts written: [KD_output/release/release-notes.md, KD_output/transcripts/<timestamp>-kd-release.md]
Agents consulted: [main-agent, release-manager, devops]
```
