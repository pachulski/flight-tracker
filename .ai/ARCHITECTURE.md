# Frontend Architecture Rules

Canonical source for structure, naming and conventions. Where any other document
disagrees with this one, this one wins.

## Directory structure

```
my-project/
├─ src/
│  ├─ application/  # Init & integration code (runs once at startup or connects to external world)
│  ├─ shared/       # Generic, domain-agnostic code
│  └─ features/     # Business logic, split by domain
├─ e2e/             # E2E tests
└─ scripts/         # CI/CD, tooling
```

All source code lives in `src/`. E2E tests go in `e2e/` at project root — never inside `src/`.

### src/application/

Init and integration only. Use this layer when code runs once at startup OR calls an external API.

```
application/   → HTTP client, routing config, store setup, i18n config, analytics SDK init, server endpoint logic
services/      → event-sending modules (analytics), notification handlers
```

Decision table:

| Question | `application/` | `shared/services/` |
|---|---|---|
| Runs once at app startup? | ✓ | ✗ |
| Calls external API? | ✓ | ✗ |
| Used repeatedly at runtime? | ✗ | ✓ |

Startup modules use the `.init` postfix (see postfix table). It is valid only
inside `application/` — an `.init` file anywhere else is in the wrong layer.

#### application/api/

Only place for backend API calls. Folder structure mirrors backend URL paths (Backend Reflection).

Rule: `GET /api/airline/flights` → file `src/application/api/airline/flights.api.ts`

```
src/application/api/
├─ airline/
│  └─ flights.api.ts          # GET /api/airline/flights
├─ airport/
│  └─ terminal/
│     └─ departures.api.ts   # GET /api/airport/terminal/departures
└─ open/
   └─ search.api.ts           # GET /api/open/search
```

The frontend only ever calls our own backend. Third-party providers are reached
through our own endpoints, so their paths never appear here — the provider call
is an implementation detail of `application/server/`.

#### application/server/

Business logic for server endpoints. Mirrors the transport layer 1:1. Transport layer never contains logic — orchestration only.

### src/shared/

Generic, technical code. No business logic, no domain knowledge.

```
src/shared/
├─ atoms/        # Global Jotai atoms (no business logic)
├─ components/   # UI components (no business logic)
├─ consts/       # Global constants
├─ hooks/        # Generic hooks
├─ schemas/      # Generic Zod schemas
├─ services/     # Runtime modules: analytics event senders, notifications
├─ store/        # Jotai store setup (`createStore` + `Provider`) — only when a custom store is needed
├─ types/        # Global types and enums
└─ utils/        # Pure functions (no side effects)
```

`utils/` = pure functions. `services/` = modules with side effects used repeatedly at runtime.

### src/features/

Each domain area has its own folder. Business logic, views, and dedicated components live here.

```
src/features/
└─ airline/
   ├─ atoms/
   ├─ components/
   │  └─ flight-card/
   │     ├─ FlightCard.tsx
   │     ├─ components/
   │     └─ utils/
   ├─ hooks/
   ├─ utils/
   ├─ consts/
   ├─ schemas/
   ├─ services/
   └─ views/
      └─ flights/
         └─ FlightsView.tsx    # entry point file must end with View
```

View entry point files must end with `View` (e.g. `FlightsView.tsx`).

## Rules

### Promotion rule

Code starts as close to where it's used as possible:

| Scope | Location |
|---|---|
| 1 component | Inside component folder |
| 2+ places in one feature | `features/{name}/` (components/, hooks/, utils/) |
| 2+ different features | `src/shared/` — after removing business logic |

Move to `shared/` only when actually used in 2+ features AND cleaned of business logic. Never move "just in case".

### Nesting limit

Max 3–4 levels deep. If exceeded, flatten — pull nested components up to the feature's top-level components' folder.

Avoid: `features/A/components/B/components/C/utils/D`

### Import hierarchy (no cycles)

Imports flow down only — never up to a layer that knows the caller's context.

- `shared/` must not import from `features/`
- `features/A` must not import from `features/B`

Enforce with `eslint-plugin-import` `no-cycle`. Individual projects may add
further `no-restricted-imports` rules; those belong in the project's own context
document, not here.

### Testing layers

Two layers with a hard split. Do not test the same thing in both.

| Layer | Scope |
|---|---|
| Vitest + React Testing Library | Logic, Zod schemas, atoms, pure functions, components in isolation |
| Playwright | Flows through the running application, and anything rendered by WebGL or a canvas — these cannot be meaningfully tested in jsdom |

Unit tests are colocated with the code they test (`src/**/*.test.ts(x)`). E2E
tests live in `e2e/` at project root and must be excluded from the Vitest config
and from the application `tsconfig` — E2E framework types must never leak into
`src/`.

### Test selectors

Target `data-testid` attributes. Never select by CSS class or by Tailwind
utility — those change for visual reasons and would make refactoring break
tests.

## Coding conventions

### Folder and file names

Folders: `kebab-case`. Files: `camelCase` (non-components) or `PascalCase` (React components).

```
flight-card/        ✓  folder
FlightCard/          ✗  folder

FlightCard.tsx         ✓  component
flightTimes.ts         ✓  non-component file
flight-times.ts        ✗  non-component file
```

### One component per file

Every file contains exactly one React component. No exceptions.

Export style is unrestricted — `export const`, `export default`, `export function` are all valid.

### Component typing

Never use `React.FC` or `React.FunctionComponent`. Type props directly in the
function arguments.

```ts
// ✓
export const Button = ({ label }: ButtonPropsT) => {}

// ✗
export const Button: React.FC<ButtonProps> = ({ label }) => {}
```

### Styles

Use Tailwind CSS. Do not use Sass, SCSS, or plain CSS (except a single global stylesheet required by the framework).

### Control flow

No single-line `if` statements — always use braces and a new line.

### Import names

Import components using their original name. Do not alias with `as`.

```ts
// ✓
import { FlightCard } from './flight-card/FlightCard'

// ✗
import { FlightCard as Card } from './flight-card/FlightCard'
```

If a name collides, the component or file is misnamed — fix the name.

### No barrel re-exports

Do not use `index.ts` as a folder re-export. Import directly from the file:

```ts
// ✓
import { FlightCard } from './flight-card/FlightCard'

// ✗
import { FlightCard } from './flight-card'
```

### File name postfixes

Every file must have a postfix describing its role. Use only postfixes from the list below — do not invent new ones. Files outside `src/` (e.g. `e2e/`, `scripts/`) and framework-required entry files (`src/main.tsx`, `src/vite-env.d.ts`) are not subject to this rule:

| Postfix | Example                 |
|---|-------------------------|
| *(none — component)* | `FlightCard.tsx`        |
| `.hook` | `useFlightCard.hook.ts` |
| `.util` | `flightCard.util.ts`    |
| `.type` | `flightCard.type.ts`    |
| `.enum` | `flightType.enum.ts`    |
| `.const` | `flightCard.const.ts`   |
| `.init` | `queryClient.init.ts` (only in `application/`) |
| `.service` | `analytics.service.ts`  |
| `.api` | `flights.api.ts` (only in `application/api/`) |
| `.atom` | `selectedFlight.atom.ts` |
| `.schema` | `flight.schema.ts`      |
| `.test` | `FlightCard.test.tsx`, `flight.schema.test.ts` |

`.init` vs `.service`: `.init` runs once at startup and creates something
(HTTP client, query client, store, i18n, SDK init). `.service` is a module with
side effects used repeatedly at runtime. If the decision table above puts the
file in `application/`, it is `.init`.

`.init` vs `.const`: `.const` holds values; `.init` is the code that consumes
them. A style URL is `.const`; the code creating an instance from it is `.init`.

Test files are colocated with the tested file and keep its name with `.test` appended before the extension.

### Type and enum postfixes

**Naming always applies.** Every type ends with `T` (`FlightCardT`, `AirlineT`),
every enum ends with `E` (`FlightTypeE`, `FlightStatusE`). No exceptions.

**Placement follows the promotion rule.** A type used in one file only — most
often a props type — stays in that file, declared above the component. It moves
to a `.type` file once a second place needs it.

```ts
// ✓ FlightCard.tsx
type FlightCardPropsT = { flight: FlightT }

export const FlightCard = ({ flight }: FlightCardPropsT) => {}
```

Enums are the exception: always in a `.enum` file inside a `types/` folder,
regardless of how many places use them. An enum with a single consumer is
usually a string union in disguise, and the separate file is a useful barrier.

Enum values must be SCREAMING_SNAKE_CASE:

```ts
enum FlightStatusE {
  CANCELLED = 'CANCELLED',
  ON_TIME = 'ON_TIME',
}
```

### Types vs interfaces

Always use `type` — never `interface` (unless an external library strictly requires it).

```ts
// ✓
type ButtonPropsT = { label: string }

// ✗
interface ButtonProps { label: string }
```