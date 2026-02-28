---
skill: api-design
version: 1.0.0
language: [EN, MS]
triggers: ["api", "endpoint", "rest", "graphql", "route"]
agents: ["architect", "engineer"]
confidence_default: HIGH
xp_reward: 30
preflight_required: false
---

# API Design Patterns

## REST Best Practices
- Use nouns for resources: `/users`, `/projects`
- HTTP methods: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
- Consistent response format: `{ data, error, meta }`
- Pagination: `?page=1&limit=20`
- Filtering: `?status=active&role=admin`
- Versioning: `/api/v1/`

## Authentication
- JWT for stateless auth
- OAuth 2.0 for third-party
- API keys for server-to-server
- Always use HTTPS

## Error Handling
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [{ "field": "email", "reason": "required" }]
  }
}
```

## Anti-Patterns
- ❌ Verbs in URLs: `/getUsers` → `/users`
- ❌ Returning 200 for errors
- ❌ Missing rate limiting
- ❌ Exposing internal IDs
