# AI Developer Assistant Instructions

> Full architecture rules, directory structure, naming conventions, and import patterns are defined in [ARCHITECTURE.md](./ARCHITECTURE.md). Read it before generating code.

## Coding Constraints (AI-specific enforcement)

**React**
- NEVER use `React.FC` or `React.FunctionComponent` — type props directly in function arguments
  - ✅ `export const Button = ({ label }: ButtonPropsT) => {}`

## Pre-Generation Checklist

Before generating code, verify:
1. [ ] Folders: `kebab-case`, plural (`hooks/`, `utils/`, `services/`, `types/`, `consts/`, `atoms/`, `schemas/`, `adapters/` — exceptions: `api/`, `store/`)
2. [ ] Files: `camelCase` + postfix from allowed list (`.hook`, `.util`, `.type`, `.enum`, `.const`, `.service`, `.atom`, `.schema`, `.test`) — components: `PascalCase.tsx`, no postfix
3. [ ] Types end with `T`, Enums end with `E` with `SCREAMING_SNAKE_CASE` values
4. [ ] Import via full explicit path — no barrel files (`index.ts` re-exports)
5. [ ] No import alias with `as` — fix the name instead
6. [ ] One component per file
7. [ ] View entry points end with `View` (e.g. `MapView.tsx`)
8. [ ] Tailwind CSS only — no Sass/SCSS/plain CSS
9. [ ] Promotion rule: inside component → feature-level → `shared/` (only when used in 2+ features, stripped of business logic)
10. [ ] Max 3–4 nesting levels — flatten if exceeded
11. [ ] No cross-feature imports (`features/A` must not import from `features/B`), `shared/` must not import from `features/`
12. [ ] No `React.FC`, no single-line `if`s
13. [ ] `type` not `interface` (unless external lib strictly requires it)
14. [ ] Server logic in `application/server/` only
15. [ ] E2E tests in `e2e/` at project root — never inside `src/`
