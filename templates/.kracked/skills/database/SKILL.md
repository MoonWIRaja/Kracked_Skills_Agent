---
skill: database
version: 1.0.0
language: [EN, MS]
triggers: ["database", "db", "sql", "nosql", "schema", "migration"]
agents: ["architect", "engineer"]
confidence_default: HIGH
xp_reward: 25
---

# Database Patterns

## Schema Design
- Normalize to 3NF, denormalize for performance
- Use UUIDs for public IDs, auto-increment for internal
- Add created_at, updated_at timestamps
- Index frequently queried columns

## SQL Best Practices
- Parameterized queries (prevent injection)
- Use migrations for schema changes
- Connection pooling
- Transaction isolation levels

## Anti-Patterns
- ❌ Storing JSON blobs instead of proper relations
- ❌ Missing indexes on foreign keys
- ❌ N+1 query problems
- ❌ No backup strategy
