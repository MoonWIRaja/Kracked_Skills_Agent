---
name: 'kd-prd'
description: '[PM] Generate full PRD with personas, metrics, risks, acceptance criteria'
---

# /kd-prd — Requirements Phase

## Agent: [PM] Paan
Load: `{project-root}/.kracked/agents/pm.md`

## Entry Criteria
- `{project-root}/KD_output/brainstorm/brainstorm.md` exists with selected approach

## Instructions

### Step 1: Load Context
Read discovery.md, brainstorm.md, scale.json, status.md

### Step 2: Generate PRD
Use template: `{project-root}/.kracked/templates/prd.md`

Include:
1. **Problem Statement** — clear definition of the problem
2. **Target Users & Personas** — who are we building for
3. **User Stories** — high-level user stories with acceptance criteria
4. **Success Metrics** — measurable KPIs
5. **MVP Scope** — what's in vs what's out for V1
6. **Risks & Mitigations** — identified risks with mitigation plans
7. **Dependencies** — external systems and third-party services
8. **Timeline Estimate** — based on scale assessment

### Step 3: Validation Block
Present Validation Block before finalizing:
```
## 🔍 Validation Block
**Keputusan**: PRD untuk [Nama Projek]
**Dicadangkan oleh**: [PM] Paan
**Keyakinan**: [HIGH/MEDIUM/LOW]
**Syor**: [Teruskan/Semak Semula]
```

### Step 4: Save Output
Save to: `{project-root}/KD_output/PRD/prd.md`

### Step 5: Update Status & XP
- Update status.md → Stage: Requirements
- +100 XP for PRD completion

### Step 6: Ask User
"PRD selesai. Sila semak dan luluskan sebelum kita teruskan ke /kd-arch."
