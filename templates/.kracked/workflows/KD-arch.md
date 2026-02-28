---
name: 'kd-arch'
description: '[ARCH+SEC] Architecture design — tech stack, system diagrams, API design, security review'
---

# /kd-arch — Architecture Phase

## Agents: [ARCH] Adi + [SEC] Sari
Load: `{project-root}/.kracked/agents/architect.md` & `{project-root}/.kracked/agents/security.md`

## Entry Criteria
- `{project-root}/KD_output/PRD/prd.md` exists and approved

## Instructions

### Step 1: Load Context
Read prd.md, scale.json, status.md, brainstorm.md

### Step 2: Tech Stack Selection
Based on PRD requirements and project scale:
1. Propose tech stack with justification for each choice
2. Consider: frontend, backend, database, hosting, CI/CD
3. Create ADR (Architecture Decision Record) for each major decision

### Step 3: System Design
Create:
1. **High-level system architecture** — mermaid component diagram
2. **Sequence diagrams** — for key user flows
3. **ER diagram** — database schema
4. **API design** — endpoints, methods, request/response schemas

### Step 4: Security Review (Sari)
[SEC] Sari reviews:
1. Authentication & authorization design
2. Data protection strategy
3. Input validation approach
4. Known vulnerability vectors

### Step 5: Save Output
Use template: `{project-root}/.kracked/templates/architecture.md`
Save to: `{project-root}/KD_output/architecture/architecture.md`

### Step 6: Update Status & XP
- Update status.md → Stage: Architecture
- +150 XP for Architecture completion

### Step 7: Gate Check
Validate gate: `{project-root}/.kracked/gates/architecture-gate.md`
"Architecture selesai. Nak teruskan ke /kd-story untuk pecah kepada epik dan cerita?"
