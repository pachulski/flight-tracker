import { useEffect, useRef, useState } from 'react'
import { createMap } from '../../../../application/map/map.init'
import { useMap } from '../../../../application/map/useMap.hook'

export const MapView = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const { setMap } = useMap()

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const map = createMap(container)
    map.once('load', () => {
      setIsLoaded(true)
    })
    setMap(map)

    return () => {
      setMap(null)
      map.remove()
    }
  }, [setMap])

  return (
    <div
      ref={containerRef}
      data-testid="map-container"
      data-loaded={isLoaded}
      className="h-full w-full"
    />
  )
}
