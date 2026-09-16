import type { LngLatLike } from 'maplibre-gl'

const DEFAULT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

export const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_MAP_STYLE_URL

export const INITIAL_CENTER: LngLatLike = [19.4, 52.1]

export const INITIAL_ZOOM = 5
