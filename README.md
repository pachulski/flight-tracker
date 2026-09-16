# Flight Tracker

A real-time web map of live aircraft positions from ADS-B data, built to render
and continuously update thousands of moving features without dropping frames.

Stack: Vite, React 19 + TypeScript, MapLibre GL JS on an OpenFreeMap dark
basemap, TanStack React Query, Jotai, Zod, Tailwind CSS. Tests with Vitest +
React Testing Library and Playwright.

**Status:** work in progress. The map renders with the dark style and a default
viewport; aircraft data comes next.

## Why this is interesting

Putting a map on a page is not the problem. The problem is that positions
arrive every ten seconds while the display has to run at 60fps, and that a few
thousand aircraft is far past the point where the obvious approach — one DOM
marker per aircraft, styling computed in JavaScript — stops working.

That shapes the whole design. Aircraft live in a single GeoJSON source feeding a
symbol layer, so updates are one call and rendering is one GPU draw. Appearance
is described with data-driven expressions rather than computed per feature.
Positions are dead-reckoned between polls so aircraft glide instead of jumping.
And none of that logic is allowed to know what draws the pixels.

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

## Data

Live aircraft state comes from the [OpenSky
Network](https://openskynetwork.github.io/opensky-api/rest.html). Two things
about it shape the code:

State vectors are fixed-order arrays rather than objects — position, altitude,
heading and velocity are read by index. They are parsed once at the boundary
with a Zod tuple schema and mapped to named fields, so nothing downstream
touches an array index. Values are metric; conversion to feet and knots happens
at display time only.

Authentication uses OAuth2 client credentials, so the browser never calls
OpenSky directly. Requests go through our own endpoint and the secret stays
server-side.

## The renderer boundary

`maplibre-gl` must never be imported in:

- `src/application/api/`
- any `utils/`, `schemas/` or `types/` folder
- anywhere in `src/shared/`

Those layers deal in domain objects and GeoJSON, which is a standard format
rather than a MapLibre type. That keeps parsing, transforms and interpolation
independent of the renderer — the same code would drive a different map (React
Native, for instance) unchanged.

MapLibre is allowed elsewhere: where the instance is created and held, and in
the components and hooks that draw on it. The rule is written as a prohibition
rather than a list of permitted folders so that it survives reorganisation, and
it is enforced by ESLint (`no-restricted-imports`).

## Roadmap

- [x] Map renders, dark basemap, default viewport
- [ ] Proxy endpoint returning one bounding box of state vectors, parsed with Zod
- [ ] Aircraft as a GeoJSON source + symbol layer
- [ ] Polling, updates via `setData`
- [ ] Heading rotation and altitude colouring via expressions
- [ ] Hover and selection through feature state, detail panel
- [ ] Interpolation between polls, animation at 60fps
- [ ] Map state in the URL, so a view can be shared as a link
- [ ] Filters — altitude band, on-ground, country
- [ ] Possibly: trajectory trails, then 3D via a MapLibre custom layer

## Documentation

- [`.ai/ARCHITECTURE.md`](.ai/ARCHITECTURE.md) — structure, naming, conventions
- [`.ai/PROJECT-CONTEXT.md`](.ai/PROJECT-CONTEXT.md) — domain, data source, rendering rules
- [`.ai/AGENTS.md`](.ai/AGENTS.md) — working protocol for AI-assisted development