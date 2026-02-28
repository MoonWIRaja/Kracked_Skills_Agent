---
name: 'kd-analyze'
description: '[ANALYST] Start Discovery phase — Scale Assessment, risk analysis, stakeholder identification'
---

# /kd-analyze — Discovery Phase

## Agent: [ANALYST] Ara
Load agent definition from: `{project-root}/.kracked/agents/analyst.md`

## Instructions

### Step 1: Scale Assessment (WAJIB)
Ask the user these 4 questions:

```
Amad: "Sebelum kita mula, biarkan saya faham skala projek ini. Jawab 4 soalan ini:"

[1] Saiz pasukan: Solo / 2-5 orang / 6+ orang?
[2] Jangka masa: < 2 minggu / 2-8 minggu / > 8 minggu?
[3] Tahap risiko: Rendah (demo/portfolio) / Sederhana (dalaman) / Tinggi (PII/kewangan)?
[4] Bilangan integrasi pihak ketiga: 0-2 / 3-5 / 6+?
```

### Step 2: Calculate Scale
Based on answers, determine scale:
- **SMALL**: Majority answers are first option → Quick flow
- **STANDARD**: Majority answers are middle option → Full flow
- **DEEP**: Majority answers are last option → Enterprise flow

Save result to: `{project-root}/.kracked/config/scale.json`

### Step 3: Discovery Analysis
Using the scale result, perform:
1. Stakeholder & target user identification
2. Initial risk assessment (risk matrix format)
3. Competitor/market analysis (if Level ≥ 3)
4. Define "Definition of Done"
5. Identify key assumptions

### Step 4: Generate Output
Use template from: `{project-root}/.kracked/templates/discovery.md`
Save output to: `{project-root}/KD_output/discovery/discovery.md`

### Step 5: Update Status
Update `{project-root}/KD_output/status/status.md`:
- Current Stage: Discovery
- What was done
- Next steps: Brainstorm phase

### Step 6: Award XP
+50 XP for Discovery completion → Update `{project-root}/.kracked/security/xp.json`

### Step 7: Ask User
"Discovery selesai. Boleh saya teruskan ke /kd-brainstorm atau awak nak semak dulu?"
