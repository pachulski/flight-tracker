import type { MapLibreMap } from 'maplibre-gl'
import { createContext, useContext } from 'react'

export const MapContext = createContext<{
  map: MapLibreMap | null
  setMap: (map: MapLibreMap | null) => void
} | null>(null)

// `map` is null until MapView has mounted the instance
export const useMap = () => {
  const context = useContext(MapContext)

  if (!context) {
    throw new Error('useMap must be used inside MapProvider')
  }

  return context
}
