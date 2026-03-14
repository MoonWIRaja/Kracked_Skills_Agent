---
skill: learning-xp
version: 1.0.0
agents: ["main-agent"]
---

# Learning XP Skill

## Purpose
Jejak XP milestone dan learning bonus untuk main agent.

## Rules
- beri milestone XP apabila command selesai
- beri learning bonus hanya jika pengetahuan baharu datang daripada sub-agent
- gunakan `learning_key` untuk elak duplicate rewards
- kemas kini `.kracked/security/xp.json`
- simpan pembelajaran penting dalam memory

## Suggested Milestone Bands
- light command: +5 hingga +15
- planning stage: +40 hingga +75
- implementation stage: +60 hingga +80
