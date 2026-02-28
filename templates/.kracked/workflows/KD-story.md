---
name: 'kd-story'
description: '[TL] Break epic into user stories with acceptance criteria'
---

# /kd-story — Story Decomposition

## Agent: [TL] Teja
Load: `{project-root}/.kracked/agents/tech-lead.md`

## Entry Criteria
- `{project-root}/KD_output/architecture/architecture.md` exists

## Instructions
1. Read architecture.md and PRD to understand system scope
2. Identify major Epics (high-level features)
3. Break each Epic into User Stories (implementable in 1-2 days)
4. For each story, write:
   - Title and description
   - Acceptance criteria (testable)
   - Dependencies
   - Estimated effort (S/M/L)
5. Save to: `{project-root}/KD_output/epics-and-stories/`
6. Update status.md + award XP
