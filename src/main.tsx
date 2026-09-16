import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './application/App'
import { MapProvider } from './application/map/MapProvider'
import { initMapLibre } from './application/map/map.init'
import { queryClient } from './application/query/queryClient.init'

initMapLibre()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MapProvider>
        <App />
      </MapProvider>
    </QueryClientProvider>
  </StrictMode>,
)
