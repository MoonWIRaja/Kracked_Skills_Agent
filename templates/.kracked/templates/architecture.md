# Architecture Template

## Decisions
- Stack:
- Frontend:
- Backend:
- DB:
- Auth:
- Deployment:

## Service Map
```text
[Client] -> [API] -> [DB]
```

## Mermaid Architecture
```mermaid
flowchart LR
    UI["Frontend"] --> API["Backend/API"]
    API --> DB["Database"]
```

## Risks and Trade-offs
- ...
