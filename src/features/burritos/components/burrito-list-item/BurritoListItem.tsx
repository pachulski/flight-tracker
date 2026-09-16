import type { BurritoT } from '../../types/burrito.type'

export const BurritoListItem = ({ burrito }: { burrito: BurritoT }) => {
  return (
    <li className="flex justify-between gap-4 text-sm text-slate-200">
      <span className="font-semibold">{burrito.name}</span>
      <span className="text-slate-400">{burrito.price.toFixed(2)} PLN</span>
    </li>
  )
}
