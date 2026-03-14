---
skill: project-reverse-analysis
version: 1.0.0
agents: ["analyst", "ui-ux-frontend", "backend-api"]
---

# Project Reverse Analysis Skill

## Purpose
Digunakan oleh `/kd-analyze` untuk faham codebase sedia ada atau mengesahkan repo kosong.

## Required Heuristics
- scan source, config, docs, tests, infra manifests
- exclude system KD files and generated folders
- kenal pasti frontend, backend, DB, auth, tests, infra
- label apa yang pasti vs inference

## Output
- repo map
- module inventory
- frontend/backend summary
- tests and gaps
- risks/tech debt
- Mermaid flow
- ASCII wireframe
