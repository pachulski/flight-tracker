# PROJECT-CONTEXT.md — Live Flight Tracker

Domain, data source and rendering rules for this project.

> Structure, naming and coding conventions live in
> [ARCHITECTURE.md](./ARCHITECTURE.md) and are not repeated here.
> [AGENTS.md](./AGENTS.md) covers generation-time enforcement.

## What this is

A real-time web map showing live aircraft positions from ADS-B data. Several
thousand aircraft rendered simultaneously, updating continuously, staying smooth.

The interesting problem is **not** "put a map on a page." It is: how do you
render and continuously update thousands of moving features without dropping
frames, and how do you keep the data logic independent of the renderer.

## Stack — do not substitute

| Concern | Library |
|---|---|
| Package manager | npm |
| Build | Vite |
| UI | React 19 + TypeScript |
| Map | MapLibre GL JS |
| Basemap tiles | OpenFreeMap (dark style, no API key) |
| Server state / polling | TanStack React Query |
| Client state | Jotai |
| Validation / parsing | Zod |
| Styling | Tailwind CSS |
| Unit / component tests | Vitest + React Testing Library |
| E2E tests | Playwright (chromium) |
| 3D (later, optional) | Three.js via MapLibre custom layer |

Deliberately **not** used: `mapbox-gl` or any Mapbox access token, deck.gl,
react-map-gl, any mapping abstraction layer, any routing library, and any
component library (shadcn/ui, DaisyUI and similar) — plain Tailwind is enough.

`npm run verify` runs lint, typecheck, unit tests and build. It and
`npm run test:e2e` must both pass before any change is considered done.

## The renderer boundary

This project adds one `no-restricted-imports` rule on top of the import
hierarchy in ARCHITECTURE.md. It is written as a prohibition, not as a list of
permitted folders — the rule is about layers, not about where files currently
happen to sit, and it must not need editing every time the tree is reorganised.

**`maplibre-gl` must never be imported in:**
- `application/api/`
- any `utils/`, `schemas/` or `types/` folder
- anywhere in `shared/`

Those layers deal in domain objects and GeoJSON — both portable, since GeoJSON
is a standard format rather than a MapLibre type. The same transforms and
interpolation would drive a React Native map unchanged.

Everywhere else MapLibre is allowed where it is genuinely needed: the code that
creates and holds the instance, and the components and hooks that draw on it.

If something in `utils/` seems to need the map, the design is wrong — lift it
into a hook instead.

## Our API surface

The browser never calls OpenSky directly — the OAuth2 client secret cannot ship
to the client. Every request goes through our own endpoint, so the frontend
calls a path we define:

```
GET /api/opensky/states  →  src/application/api/opensky/states.api.ts
```

Backend Reflection applies normally. The `opensky/` segment namespaces the
provider, leaving room for other sources later. That this endpoint forwards to
`opensky.org/api/states/all` is an implementation detail of the server layer and
invisible to the frontend.

The server is also the right place to reshape the response — drop nulls, trim
callsigns, omit fields nothing consumes — so the client receives something
already sane.

## Where things live

```
src/
├─ application/
│  ├─ api/
│  │  └─ opensky/
│  │     └─ states.api.ts           # GET /api/opensky/states
│  ├─ map/
│  │  ├─ map.init.ts                # creates the instance (no React)
│  │  ├─ mapStyle.const.ts          # OpenFreeMap style URL, default viewport
│  │  ├─ MapProvider.tsx            # holds the instance in context
│  │  └─ useMap.hook.ts             # reads it back
│  └─ query/
│     └─ queryClient.init.ts
├─ shared/
│  ├─ types/
│  │  └─ geo.type.ts
│  └─ utils/
│     └─ units.util.ts              # m→ft, m/s→kt
└─ features/
   ├─ map/
   │  └─ views/
   │     └─ map/
   │        └─ MapView.tsx          # container + mount + composes layers
   └─ aircraft/
      ├─ atoms/
      │  ├─ selectedAircraft.atom.ts
      │  └─ aircraftFilters.atom.ts
      ├─ components/
      │  ├─ aircraft-layer/
      │  │  └─ AircraftLayer.tsx
      │  └─ aircraft-details/
      │     └─ AircraftDetails.tsx
      ├─ consts/
      │  ├─ aircraftLayer.const.ts   # paint/layout expressions
      │  └─ polling.const.ts
      ├─ hooks/
      │  ├─ useAircraftStates.hook.ts
      │  ├─ useAircraftSource.hook.ts
      │  └─ useAircraftHover.hook.ts
      ├─ schemas/
      │  └─ stateVector.schema.ts
      ├─ types/
      │  └─ aircraft.type.ts
      └─ utils/
         ├─ stateVector.util.ts      # raw tuple → domain object
         ├─ aircraftGeoJson.util.ts  # domain → FeatureCollection
         ├─ deadReckoning.util.ts
         └─ boundingBox.util.ts
```

### Two features, not one

`features/map/` owns the map as UI. `features/aircraft/` owns one kind of data
drawn on it. Airports, weather or airspace boundaries would be further siblings,
each adding a line to `MapView` and touching nothing else.

`MapView` is currently one file: it holds the container ref, mounts the
instance, and renders the layers inside. Do not split a `MapContainer` out of it
until something else actually needs the container — a second consumer, or a view
where the map is one part of a larger layout. Per the promotion rule in
ARCHITECTURE.md, separation is earned, not anticipated.

`MapView` creates the instance, so it imports `maplibre-gl` directly — the
prohibition above does not reach `views/`, and a rule forbidding the MapLibre
type in the file that owns the MapLibre lifecycle would be fighting reality.

`AircraftLayer` needs the map instance but must not import from `features/map/`.
The instance and its context therefore live in `application/map/`, not in either
feature and not in `shared/`: it is created once at startup and talks to an
external tile server, which is exactly what the decision table in
ARCHITECTURE.md puts in `application/`. Both features read it through
`useMap.hook.ts` there, so every import still flows downward and `shared/` stays
free of `maplibre-gl`.

`map.init.ts` builds the instance from the options in `mapStyle.const.ts` and
contains no React; `MapView` mounts it. If `MapView` ends up doing both, delete
`map.init.ts` rather than keeping a file that only forwards.

## OpenSky Network API

Docs: https://openskynetwork.github.io/opensky-api/rest.html

### Auth

OAuth2 **client credentials** flow (changed March 2026 — older tutorials showing
HTTP Basic auth are out of date). Exchange `client_id` + `client_secret` for a
bearer token, cache in memory, refresh roughly every 25 minutes (tokens last
about 30).

In development, route through Vite's `server.proxy` in `vite.config.ts` so the
secret stays in the dev server process. Once deployed, the token exchange and
forwarding belong in `src/application/server/`.

`.env` is gitignored. Commit `.env.example` with empty values.

### Upstream endpoint

`GET /api/states/all?lamin={}&lomin={}&lamax={}&lomax={}`

Always pass a bounding box. Requesting global state wastes API credits and
returns far more than can be usefully displayed. Credits are consumed per
request and scale with the area queried, so poll conservatively — 10 seconds is
a sensible default, slower when the tab is hidden.

### State vectors are positional arrays, not objects

Each aircraft is a fixed-order array. Parse with a Zod **tuple** in
`stateVector.schema.ts`, map to a named domain object in `stateVector.util.ts`,
and never index by number outside those two files.

| Idx | Field | Type | Notes |
|---|---|---|---|
| 0 | `icao24` | string | Unique ID. Use as the GeoJSON feature id. |
| 1 | `callsign` | string \| null | **Whitespace-padded — trim it.** |
| 2 | `originCountry` | string | |
| 3 | `timePosition` | number \| null | Unix seconds |
| 4 | `lastContact` | number | Unix seconds |
| 5 | `longitude` | number \| null | |
| 6 | `latitude` | number \| null | |
| 7 | `baroAltitude` | number \| null | **metres**, not feet |
| 8 | `onGround` | boolean | |
| 9 | `velocity` | number \| null | **m/s**, not knots |
| 10 | `trueTrack` | number \| null | degrees clockwise from north |
| 11 | `verticalRate` | number \| null | m/s, positive = climbing |
| 12 | `sensors` | number[] \| null | |
| 13 | `geoAltitude` | number \| null | metres |
| 14 | `squawk` | string \| null | |
| 15 | `spi` | boolean | |
| 16 | `positionSource` | number | |
| 17 | `category` | number | may be absent — make optional |

OpenSky returns snake_case; the domain object uses camelCase. That mapping lives
in `stateVector.util.ts` and nowhere else.

Null latitude or longitude is common. **Filter those out before building
GeoJSON** or MapLibre will silently drop or misplace features.

Convert units for display only, via `units.util.ts` — never in the domain layer.
Metres → feet (× 3.28084), m/s → knots (× 1.94384).

## MapLibre: required patterns

### Sources and layers, never markers

One GeoJSON source holding all aircraft, feeding a symbol layer. Update with:

```ts
(map.getSource('aircraft') as GeoJSONSource).setData(featureCollection)
```

**Never create a `Marker` per aircraft.** Markers are absolutely-positioned DOM
elements repositioned on every map move — fine for a dozen, catastrophic at a
few thousand. Symbol layers render on the GPU in a single draw call.

### Style with data-driven expressions, not JavaScript loops

Appearance is described declaratively in the layer paint/layout config and
evaluated on the GPU. Do not compute per-feature styling in JS. Keep expressions
in `aircraftLayer.const.ts`.

```ts
// rotate each icon to its heading
'icon-rotate': ['get', 'trueTrack']

// colour by altitude
'icon-color': [
  'interpolate', ['linear'], ['get', 'baroAltitude'],
  0, '#ff6b35', 3000, '#f7c548', 12000, '#4fc3f7',
]
```

### Hover and selection use feature state

`map.setFeatureState({ source: 'aircraft', id }, { hover: true })` plus
`['feature-state', 'hover']` in an expression. This avoids re-uploading the whole
dataset to change one feature's appearance. Requires stable feature ids — use
`icao24` and set `promoteId: 'icao24'` on the source.

### Two setup traps

**Tailwind preflight vs MapLibre CSS.** MapLibre's stylesheet must be imported
where preflight cannot override it, or the map controls render broken. If
control styling looks wrong after touching the CSS import order, this is why.

**The map container needs `data-testid="map-container"`.** MapLibre renders
through WebGL, so E2E tests are the only layer that can assert anything about
it, and they must not hang off Tailwind classes.

### MapLibre owns the viewport, React does not

The map instance is imperative and holds its own state. Mirroring viewport into
React state on every `move` event will destroy frame rate.

- Viewport during interaction: lives in the map, read via `map.getCenter()` etc.
- UI state (selected aircraft, filters, panel open): Jotai atoms
- Never re-render the React tree on map movement

Create the map once, keep the instance in a ref, tear down on unmount.

### Batch updates to one per frame

Throttle `setData` with `requestAnimationFrame` inside
`useAircraftSource.hook.ts`. Never call it directly from a network response
handler.

## Real-time behaviour

Data arrives every ~10s; the display must run at 60fps. Decouple them.

- React Query `refetchInterval` handles polling
- Between polls, **dead-reckon** positions from `trueTrack` and `velocity`
  (great-circle projection forward from the last known point) —
  `deadReckoning.util.ts`, no MapLibre import
- Animate in a `requestAnimationFrame` loop, writing to the GeoJSON source
- On new data, reconcile rather than snap — aircraft must never teleport

## Domain gotchas

**Great circles.** The shortest path between two points on a sphere is not a
straight line on a Mercator projection. Flight paths must curve. Use Turf's
`greatCircle` if drawing trajectories.

**Antimeridian.** A path crossing ±180° longitude renders as a line streaking
backwards across the whole map unless split. Every flight tracker hits this.

**Mercator distortion.** Icon spacing and clustering behave differently at high
latitudes. Aircraft near the poles need care.

**Units.** OpenSky is metric. Aviation displays are feet and knots.

## URL as shared state

Sync map centre, zoom and selected `icao24` to the query string via
`URLSearchParams` + `history.replaceState`. Not routing — shareable state. In an
operational context, sending someone a link to exactly what you are looking at is
a real feature. Also makes refresh non-destructive.

Keep it to ~20 lines. No router.

## Visual direction

Dark basemap (done — OpenFreeMap dark, no API key). The style URL lives in an
environment variable with a working fallback, so the map renders immediately
after `npm run dev` with no setup. Not aesthetics: operational displays are
dark because bright symbols on a dark ground have far better contrast, which is
why every ATC and flight-tracking interface looks that way. The basemap recedes;
aircraft are the only thing competing for attention.

Do not author basemap cartography. **Do** own the styling of data layers — that
is where the work is.

## Build order

Do not start the next step until the current one works end to end.

1. ~~Map renders, dark style, sensible default viewport~~ **done**
2. Proxy endpoint returning one bbox of state vectors, parsed with Zod
3. Render aircraft as a GeoJSON source + symbol layer
4. Poll on an interval, update via `setData`
5. Rotate icons by heading, colour by altitude (expressions only)
6. Hover + click → detail panel, using feature state
7. Interpolate between polls, animate at 60fps
8. URL state sync
9. Filters (altitude band, on-ground, country)
10. Optional: trajectory trails, then Three.js custom layer for 3D

## Working notes

- Parse unknown data with Zod, never cast.
- Small commits with real messages, from the first one.
- Keep the README current: what it does, how to run it, and the renderer
  boundary — that explanation matters more than screenshots.
