# Flight Tracker

A real-time web map of live aircraft positions from ADS-B data (OpenSky
Network), built to render and continuously update thousands of moving features
without dropping frames.

Stack: Vite, React 19 + TypeScript, MapLibre GL JS on an OpenFreeMap dark
basemap, TanStack React Query, Jotai, Zod, Tailwind CSS.

Current status: the map renders with the dark style and a default viewport.
Aircraft data comes in later steps.

## Running

Node version: see `.nvmrc`.

```sh
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```sh
npm run verify     # lint + typecheck + unit tests + build
npm run test:e2e   # Playwright
```

## The renderer boundary

`maplibre-gl` must never be imported in:

- `src/application/api/`
- any `utils/`, `schemas/` or `types/` folder
- anywhere in `src/shared/`

Those layers deal in domain objects and GeoJSON, which is a standard format
rather than a MapLibre type. That keeps data parsing, transforms and
interpolation independent of the renderer: the same code would drive a
different map (e.g. React Native) unchanged. MapLibre is allowed elsewhere —
where the instance is created and held, and in the components and hooks that
draw on it. The rule is enforced by ESLint (`no-restricted-imports`).

## Documentation

- [`.ai/ARCHITECTURE.md`](.ai/ARCHITECTURE.md) — structure, naming, conventions
- [`.ai/PROJECT-CONTEXT.md`](.ai/PROJECT-CONTEXT.md) — domain, data source, rendering rules
