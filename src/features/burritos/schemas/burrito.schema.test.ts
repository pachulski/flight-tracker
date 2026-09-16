import { burritoSchema } from './burrito.schema'

const validBurrito = {
  id: 'carnitas',
  name: 'Carnitas',
  price: 24.9,
  spiciness: 2,
}

describe('burritoSchema', () => {
  it('accepts a valid burrito', () => {
    expect(burritoSchema.parse(validBurrito)).toEqual(validBurrito)
  })

  it('rejects spiciness out of range', () => {
    const result = burritoSchema.safeParse({ ...validBurrito, spiciness: 6 })

    expect(result.success).toBe(false)
  })
})
