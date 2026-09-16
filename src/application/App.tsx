import { BurritosView } from '../features/burritos/views/burritos/BurritosView'
import { MapView } from '../features/map/views/map/MapView'

export const App = () => {
  return (
    <main className="relative h-svh w-full">
      <MapView />
      <aside className="absolute top-4 left-4 flex w-72 flex-col gap-3 rounded-lg bg-slate-900/90 p-4 shadow-lg">
        <h1 className="text-lg font-bold text-sky-400">Flight Tracker</h1>
        <BurritosView />
      </aside>
    </main>
  )
}
