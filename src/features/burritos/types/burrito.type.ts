import type { z } from 'zod'
import type { burritoSchema } from '../schemas/burrito.schema'

export type BurritoT = z.infer<typeof burritoSchema>
