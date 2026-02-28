---
skill: testing
version: 1.0.0
language: [EN, MS]
triggers: ["test", "ujian", "tdd", "coverage", "jest", "vitest"]
agents: ["qa", "engineer"]
confidence_default: HIGH
xp_reward: 25
---

# Testing Patterns

## TDD Cycle
1. **RED** — Write failing test
2. **GREEN** — Write minimal code to pass
3. **REFACTOR** — Clean up while keeping tests green

## Test Types
- **Unit**: Isolated function testing (fastest)
- **Integration**: Component interaction testing
- **E2E**: Full user flow testing (slowest)
- Coverage target: ≥80%

## Best Practices
- Test behavior, not implementation
- One assertion per concept
- Descriptive test names
- Setup/teardown for shared state

## Anti-Patterns
- ❌ Testing implementation details
- ❌ Flaky tests (non-deterministic)
- ❌ Skipping edge cases
- ❌ No test for error paths
