import type { z } from 'zod'
import type { burritoSchema } from '../../schemas/burrito.schema'

type BurritoT = z.infer<typeof burritoSchema>

type BurritoListItemPropsT = {
  burrito: BurritoT
  isSelected: boolean
  onSelect: () => void
}

export const BurritoListItem = ({
  burrito,
  isSelected,
  onSelect,
}: BurritoListItemPropsT) => {
  return (
    <li>
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={`flex w-full justify-between gap-4 rounded px-2 py-1 text-sm ${isSelected ? 'bg-sky-900 text-sky-100' : 'text-slate-200 hover:bg-slate-800'}`}
      >
        <span data-testid="burrito-name" className="font-semibold">
          {burrito.name}
        </span>
        <span data-testid="burrito-price" className="text-slate-400">
          {burrito.price.toFixed(2)} PLN
        </span>
      </button>
    </li>
  )
}
