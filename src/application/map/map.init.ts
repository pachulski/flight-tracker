import { MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { INITIAL_CENTER, INITIAL_ZOOM, MAP_STYLE_URL } from './mapStyle.const'

// MapLibre v6 requires the worker URL to be set once when using a bundler
export const initMapLibre = () => {
  setWorkerUrl(maplibreWorkerUrl)
}

export const createMap = (container: HTMLElement) => {
  const map = new MapLibreMap({
    container,
    style: MAP_STYLE_URL,
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  })
  map.addControl(new NavigationControl(), 'top-right')

  return map
}
