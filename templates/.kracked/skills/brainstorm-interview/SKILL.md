---
skill: brainstorm-interview
version: 1.0.0
agents: ["main-agent", "pm", "analyst", "ui-ux-frontend", "backend-api"]
---

# Brainstorm Interview Skill

## Purpose
Digunakan oleh `/kd-brainstorm` untuk jalankan sesi discovery yang kaya dan terarah.

## Mandatory Question Domains
- project objective
- target users
- UI theme and style
- screen/page inventory
- API/service boundary
- stack choice
- database choice
- environments
- auth
- integrations
- deployment
- testing strategy
- constraints and risks

## Rules
- setiap soalan mesti nyatakan siapa yang bertanya
- setiap soalan mesti ada recommended answer
- setiap soalan mesti benarkan custom answer
- selepas user menjawab, jalankan roundtable synthesis
