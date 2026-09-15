# Frontend Architecture Rules

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
services/      → Redux slices, event-sending modules (analytics), notification handlers
```

Decision table:

| Question | `application/` | `shared/services/` |
|---|---|---|
| Runs once at app startup? | ✓ | ✗ |
| Calls external API? | ✓ | ✗ |
| Used repeatedly at runtime? | ✗ | ✓ |

#### application/api/

Only place for backend API calls. Folder structure mirrors backend URL paths (Backend Reflection).

Rule: `GET /api/airline/flight` → file `src/application/api/airline/fligth.ts`

```
src/application/api/
├─ airline/
│  └─ flights.ts              # GET /api/airline/flights
├─ airport/
│  └─ terminal/
│     └─ departures.ts   # GET /api/airport/terminal/departures
└─ open/
   └─ search.ts              # GET /api/open/search
```

#### application/server/

Business logic for server endpoints. Mirrors the transport layer 1:1. Transport layer never contains logic — orchestration only.

### src/shared/

Generic, technical code. No business logic, no domain knowledge.

```
src/shared/
├─ components/   # UI components (no business logic)
├─ consts/       # Global constants
├─ hooks/        # Generic hooks
├─ services/     # Runtime modules: Redux slices, analytics event senders, notifications
├─ store/        # State setup
├─ types/        # Global types and enums
└─ utils/        # Pure functions (no side effects)
```

`utils/` = pure functions. `services/` = modules with side effects used repeatedly at runtime.

### src/features/

Each domain area has its own folder. Business logic, views, and dedicated components live here.

```
src/features/
└─ airline/
   ├─ components/
   │  └─ flight-card/
   │     ├─ FlightCard.tsx
   │     ├─ components/
   │     └─ utils/
   ├─ hooks/
   ├─ utils/
   ├─ consts/
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

Enforce with `eslint-plugin-import` `no-cycle` rule.

## Coding conventions

### Folder and file names

Folders: `kebab-case`. Files: `camelCase` (non-components) or `PascalCase` (React components).

```
flight-card/        ✓  folder
FlightCard/          ✗  folder

FlightCard.tsx             ✓  component
flightTimes.ts         ✓  non-component file
flight-times.ts        ✗  non-component file
```

### One component per file

Every file contains exactly one React component. No exceptions.

Export style is unrestricted — `export const`, `export default`, `export function` are all valid.

### Styles

Use Tailwind CSS. Do not use Sass, SCSS, or plain CSS (except a single global stylesheet required by the framework).

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

Every file must have a postfix describing its role. Use only postfixes from the list below — do not invent new ones. Files outside `src/` (e.g. `e2e/`, `scripts/`) are not subject to this rule:

| Postfix | Example                 |
|---|-------------------------|
| *(none — component)* | `FlightCard.tsx`        |
| `.hook` | `useFlightCard.hook.ts` |
| `.util` | `flightCard.util.ts`    |
| `.type` | `flightCard.type.ts`    |
| `.enum` | `flightType.enum.ts`    |
| `.const` | `flightCard.const.ts`   |
| `.service` | `analytics.service.ts`  |
| `.slice` | `flight.slice.ts`       |

### Type and enum postfixes

All types use `T` postfix: `FlightCardT`, `AirlineT` — in `.type` files.
All enums use `E` postfix: `FlightTypeE`, `FlightStatusE` — in `.enum` files inside `types/` folder.

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
