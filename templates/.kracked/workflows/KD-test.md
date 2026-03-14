# `/kd-test`

## Purpose
Semak strategi ujian, hasil test semasa, dan coverage gaps.

## Skills To Load
- `testing`
- `agent-dialogue`
- `learning-xp`

## Required Agents
- main-agent
- qa
- engineer

## Required Actions
1. Ringkaskan test strategy.
2. Jika tests boleh dikenal pasti, terangkan kategori dan gaps.
3. Beri dialog pendek antara QA dan engineer.
4. Tulis output ke `KD_output/testing/test-report.md`.

## Footer
```text
Next command: /kd-code-review
XP updated: +45
Learning bonus: +5 / none
Memory updated: yes
Artifacts written: [KD_output/testing/test-report.md, KD_output/transcripts/<timestamp>-kd-test.md]
Agents consulted: [main-agent, qa, engineer]
```
