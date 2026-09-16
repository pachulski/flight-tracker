import { render, screen } from '@testing-library/react'
import { BurritoListItem } from './BurritoListItem'

describe('BurritoListItem', () => {
  it('renders name and formatted price', () => {
    render(
      <ul>
        <BurritoListItem
          burrito={{
            id: 'carnitas',
            name: 'Carnitas',
            price: 24.9,
            spiciness: 2,
          }}
        />
      </ul>,
    )

    expect(screen.getByText('Carnitas')).toBeInTheDocument()
    expect(screen.getByText('24.90 PLN')).toBeInTheDocument()
  })
})
