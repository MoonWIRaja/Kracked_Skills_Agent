---
name: 'kd-help'
description: 'Smart guidance — analyzes current state and tells you what to do next'
---

# /kd-help — Smart Guidance

## Instructions

### Step 1: Load Context
1. Read `{project-root}/KD_output/status/status.md`
2. Read `{project-root}/.kracked/config/scale.json`
3. Read `{project-root}/.kracked/security/xp.json`

### Step 2: Analyze State
Determine:
- Current stage in the 8-stage workflow
- What has been completed
- What is blocking progress
- What should be done next

### Step 3: Provide Guidance
Based on current state:
1. Tell user EXACTLY what to do next
2. Suggest the appropriate command
3. Explain WHY this is the next step
4. If user included a question, answer it in context

### Stage-Based Guidance
- **No project**: Suggest `/kd-new` or `/kd-analyze`
- **Discovery done**: Suggest `/kd-brainstorm`
- **Brainstorm done**: Suggest `/kd-prd`
- **PRD done**: Suggest `/kd-arch`
- **Architecture done**: Suggest `/kd-story`
- **Stories created**: Suggest `/kd-sprint-planning` then `/kd-dev-story`
- **Implementation done**: Suggest `/kd-code-review`
- **Quality pass**: Suggest `/kd-deploy`
- **Deployed**: Suggest `/kd-release`

### Step 4: Update Status
Note that help was requested in status.md
