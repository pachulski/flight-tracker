import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { getBurritos } from '../../../application/api/burritos.api'
import { burritoSchema } from '../schemas/burrito.schema'

export const useBurritos = () => {
  return useQuery({
    queryKey: ['burritos'],
    queryFn: async () => z.array(burritoSchema).parse(await getBurritos()),
  })
}
