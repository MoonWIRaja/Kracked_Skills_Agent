---
skill: security
version: 1.0.0
language: [EN, MS]
triggers: ["security", "keselamatan", "owasp", "vulnerability", "audit"]
agents: ["security"]
confidence_default: HIGH
xp_reward: 30
preflight_required: true
---

# Security Patterns

## OWASP Top 10 Checklist
1. Broken Access Control — validate permissions on every request
2. Cryptographic Failures — use strong encryption, never custom crypto
3. Injection — parameterized queries, input sanitization
4. Insecure Design — threat modeling, security by design
5. Security Misconfiguration — least privilege, disable defaults
6. Vulnerable Components — regular dependency audits
7. Authentication Failures — MFA, strong passwords, rate limiting
8. Software Integrity — verify dependencies, signed commits
9. Logging Failures — log security events, monitor anomalies
10. SSRF — validate/sanitize URLs, whitelist allowed destinations

## Anti-Patterns
- ❌ Storing passwords in plain text
- ❌ SQL string concatenation
- ❌ Disabling CORS for convenience
- ❌ Logging sensitive data (passwords, tokens)
- ❌ Using deprecated crypto algorithms
