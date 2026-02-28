---
skill: webapp
version: 1.0.0
language: [EN, MS]
triggers: ["react", "vue", "angular", "svelte", "next", "web app", "frontend"]
agents: ["engineer", "architect"]
confidence_default: HIGH
xp_reward: 30
preflight_required: false
---

# Web Application Patterns

## React / Next.js Patterns
- Functional components with hooks
- Server components (Next.js 14+)
- State management: Zustand / Jotai for simple, Redux for complex
- File-based routing (App Router)

## Vue Patterns
- Composition API (Vue 3+)
- Pinia for state management
- Script setup syntax

## General Best Practices
- Component-driven architecture
- Responsive design first
- Accessibility (WCAG 2.1 AA)
- Performance: lazy loading, code splitting
- SEO: meta tags, semantic HTML

## Anti-Patterns
- ❌ Prop drilling beyond 2 levels
- ❌ Business logic in components
- ❌ Inline styles for reusable elements
- ❌ Missing error boundaries
