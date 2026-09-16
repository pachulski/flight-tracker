import { MapLibreMap, NavigationControl } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import {
  INITIAL_CENTER,
  INITIAL_ZOOM,
  MAP_STYLE_URL,
} from '../../consts/map.const'

export const MapView = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    })
    map.addControl(new NavigationControl(), 'top-right')
    map.once('load', () => {
      setIsLoaded(true)
    })

    return () => {
      map.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      data-testid="map-container"
      data-loaded={isLoaded}
      className="h-full w-full"
    />
  )
}
