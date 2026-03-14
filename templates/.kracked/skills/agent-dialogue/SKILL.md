---
skill: agent-dialogue
version: 1.0.0
agents: ["main-agent", "all"]
---

# Agent Dialogue Skill

## Purpose
Standardkan gaya transcript perbualan KD supaya semua command memaparkan kolaborasi yang boleh dibaca user.

## Rules
- mula dengan scene header
- gunakan speaker labels `[Name | Role]`
- sekurang-kurangnya 3 pertukaran dialog untuk stage utama
- tunjuk soalan, cadangan, disagreement, dan rumusan
- akhiri dengan footer standard

## Transcript Artifact
- tulis machine-readable event ke `.kracked/runtime/transcripts.jsonl`
- tulis human-readable artifact ke `KD_output/transcripts/{timestamp}-{command}.md`
