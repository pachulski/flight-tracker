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
          isSelected={false}
          onSelect={vi.fn()}
        />
      </ul>,
    )

    expect(screen.getByTestId('burrito-name')).toHaveTextContent('Carnitas')
    expect(screen.getByTestId('burrito-price')).toHaveTextContent('24.90 PLN')
  })
})
