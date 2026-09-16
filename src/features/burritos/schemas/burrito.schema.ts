import { z } from 'zod'

export const burritoSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  price: z.number().nonnegative(),
  spiciness: z.number().int().min(0).max(5),
})
