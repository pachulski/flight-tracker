import { useAtom } from 'jotai'
import { selectedBurritoIdAtom } from '../../atoms/selectedBurritoId.atom'
import { BurritoListItem } from '../../components/burrito-list-item/BurritoListItem'
import { useBurritos } from '../../hooks/useBurritos.hook'

export const BurritosView = () => {
  const { data: burritos, isPending, isError } = useBurritos()
  const [selectedBurritoId, setSelectedBurritoId] = useAtom(
    selectedBurritoIdAtom,
  )

  if (isPending) {
    return <p className="text-sm text-slate-400">Loading burritos…</p>
  }

  if (isError) {
    return <p className="text-sm text-red-400">Could not load burritos.</p>
  }

  return (
    <ul className="flex flex-col gap-1">
      {burritos.map((burrito) => (
        <BurritoListItem
          key={burrito.id}
          burrito={burrito}
          isSelected={burrito.id === selectedBurritoId}
          onSelect={() => {
            setSelectedBurritoId(burrito.id)
          }}
        />
      ))}
    </ul>
  )
}
