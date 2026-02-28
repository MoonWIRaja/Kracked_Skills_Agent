---
skill: devops
version: 1.0.0
language: [EN, MS]
triggers: ["deploy", "ci/cd", "docker", "kubernetes", "pipeline", "devops"]
agents: ["devops"]
confidence_default: HIGH
xp_reward: 30
preflight_required: true
---

# DevOps Patterns

## CI/CD Pipeline
1. Lint → 2. Test → 3. Build → 4. Deploy (staging) → 5. Deploy (production)

## Docker
- Multi-stage builds
- Non-root user
- .dockerignore
- Health checks

## Deployment Strategies
- **Blue-Green**: Zero downtime, instant rollback
- **Canary**: Gradual rollout, monitor metrics
- **Rolling**: One-by-one replacement

## Monitoring
- Application logs (structured JSON)
- Health check endpoints
- Error tracking (Sentry, etc.)
- Uptime monitoring

## Anti-Patterns
- ❌ Deploying without tests passing
- ❌ No rollback plan
- ❌ Secrets in code/config files
- ❌ Manual deployments to production
