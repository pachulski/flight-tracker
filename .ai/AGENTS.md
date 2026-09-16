# AI Developer Assistant Instructions

## Read first

1. [ARCHITECTURE.md](./ARCHITECTURE.md) — structure, naming, conventions. Canonical.
2. [PROJECT-CONTEXT.md](./PROJECT-CONTEXT.md) — this project's domain, data source and rendering rules.

**This file defines no rules about code.** It names the ones that get broken most
often when code is generated rather than written, and it owns the working
protocol below. If anything here appears to contradict ARCHITECTURE.md on a
question of code, ARCHITECTURE.md is correct and this file is stale.

## Working protocol

**Never touch git.** No `git add`, `git commit`, `git push`, no rewriting
history. Commits are made by hand.

**Never install or switch Node versions.** If the installed version does not
meet a tool's requirements, say so and stop.

**Work in stages and stop for acceptance at the end of each one.** A stage is
finished when the application runs, `npm run verify` and `npm run test:e2e` pass
cleanly, and nothing in the codebase references something that will only exist
in a later stage. Half-wired code between stages is not acceptable — each stage
must stand on its own as a commit.

**Close each stage with a report:** the files created or changed, a proposed
commit message (not executed), and `git status`.

**Do not write configuration from memory.** Tooling config formats change and
training data goes stale — ESLint flat config, the current Tailwind/Vite
integration and similar have all moved recently. Use the official scaffolding
command where one exists, otherwise check current documentation. Say which
version you configured for.

**Build only what was asked.** No CI pipelines, Docker, git hooks, extra test
suites, or README beyond a few lines, unless requested.

## Habitual failure modes

Defaults to suppress. Each is already covered in ARCHITECTURE.md — listed here
because these are the ones that slip through.

| Default reflex | Correct here |
|---|---|
| `React.FC<Props>` | Type props in the function arguments |
| `interface Props` | `type PropsT` |
| `index.ts` re-exporting a folder | Import directly from the file |
| Inventing a postfix that reads well | Use only the postfix table |
| `import { X as Y }` to resolve a collision | Rename the file or the component |
| Two small components in one file | One component per file |
| `if (x) return` on one line | Braces, new line |
| Plain CSS or a `.module.css` | Tailwind |
| `as SomeType` on external data | Parse it with Zod |
| Adding a dependency to solve a small problem | Ask first (see below) |

## Before generating code

- Which layer does this belong in — `application/`, `shared/`, or a feature?
  Check the decision table in ARCHITECTURE.md rather than guessing.
- Does the filename carry a postfix from the table, and is it the right one?
  `.init` and `.api` are location-restricted.
- Does this belong at component level, feature level, or `shared/`? Default to
  the narrowest scope — promotion is earned, not anticipated.
- Would this import cross a boundary (`shared/` → `features/`,
  `features/A` → `features/B`, or a restricted import named in
  PROJECT-CONTEXT.md)?
- Is the path about to exceed 3–4 nesting levels?

## Stop and ask rather than deciding alone

- A new dependency is needed. Name it and say why before adding it.
- A rule in ARCHITECTURE.md appears to have no answer for the case at hand — say
  so explicitly rather than inventing a convention or carving an exception. Most
  apparent gaps turn out to be modelling errors one level up, and the ones that
  are real are worth knowing about.
- The task appears to require importing a renderer or platform library into a
  layer that PROJECT-CONTEXT.md forbids. That usually means the design is wrong,
  not the rule.
