---
name: 'kd-code-review'
description: '[QA+SEC] Systematic code review — quality, security, test coverage'
---

# /kd-code-review — Quality Phase

## Agents: [QA] Qila + [SEC] Sari
Load: `{project-root}/.kracked/agents/qa.md` & `{project-root}/.kracked/agents/security.md`

## Instructions
1. Review all changed code systematically
2. Check OWASP Top 10 (Sari)
3. Verify test coverage ≥ 80% (Qila)
4. Use checklist: `{project-root}/.kracked/checklists/code-review-checklist.md`
5. Save to: `{project-root}/KD_output/code-review/code-review.md`
6. +60 XP if passed without critical issues
