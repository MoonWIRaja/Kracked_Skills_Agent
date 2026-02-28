---
name: 'kd-brainstorm'
description: '[ANALYST+PM] Brainstorming session — generate multiple approaches with scoring'
---

# /kd-brainstorm — Brainstorm Phase

## Agents: [ANALYST] Ara + [PM] Paan
Load: `{project-root}/.kracked/agents/analyst.md` & `{project-root}/.kracked/agents/pm.md`

## Entry Criteria
- `{project-root}/KD_output/discovery/discovery.md` exists and approved

## Instructions

### Step 1: Load Context
- Read discovery.md for project context
- Read scale.json for project scale
- Read status.md for current state

### Step 2: Generate Approaches
Generate 3-5 different solution approaches. For each approach:
1. **Name & summary** (1-2 sentences)
2. **Value score** (1-5): How well it solves the problem
3. **Effort score** (1-5): How much work to implement
4. **Risk score** (1-5): How risky is this approach
5. **Pros & Cons** (bullet points)

### Step 3: Score & Rank
Calculate total score for each: `Value × 2 - Effort - Risk`
Rank from highest to lowest score.

### Step 4: Consensus (Party Mode if Scale ≥ STANDARD)
If scale is STANDARD or DEEP, activate Party Mode:
- [ANALYST] Ara gives perspective on feasibility
- [PM] Paan gives perspective on user value
- [ARCH] Adi gives perspective on technical complexity (if relevant)
- Each agent provides confidence score (HIGH/MEDIUM/LOW)
- Consensus reached by majority

### Step 5: Generate Output
Save to: `{project-root}/KD_output/brainstorm/brainstorm.md`
Include all approaches, scores, and selected approach with justification.

### Step 6: Update Status
Update status.md with brainstorm results and next step: Requirements phase.

### Step 7: Ask User
"Brainstorm selesai. Pendekatan [X] dipilih. Nak teruskan ke /kd-prd?"
