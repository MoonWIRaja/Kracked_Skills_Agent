---
skill: commit
version: 1.0.0
language: [EN, MS]
triggers: ["commit", "git commit", "message"]
agents: ["engineer"]
confidence_default: HIGH
xp_reward: 5
preflight_required: false
---

# Commit Message Conventions

## Format
```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

## Types
- **feat**: Ciri baru
- **fix**: Pembetulan bug
- **docs**: Perubahan dokumentasi
- **style**: Format (tiada perubahan kod)
- **refactor**: Refactoring kod
- **test**: Tambah/ubah ujian
- **chore**: Maintenance tasks

## Rules
- Subject line ≤ 72 characters
- Use imperative mood: "add" not "added"
- No period at end of subject
- Body explains WHY, not WHAT
