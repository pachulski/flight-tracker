import type { MapLibreMap } from 'maplibre-gl'
import { type ReactNode, useMemo, useState } from 'react'
import { MapContext } from './useMap.hook'

type MapProviderPropsT = {
  children: ReactNode
}

export const MapProvider = ({ children }: MapProviderPropsT) => {
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const value = useMemo(() => ({ map, setMap }), [map])

  return <MapContext value={value}>{children}</MapContext>
}
