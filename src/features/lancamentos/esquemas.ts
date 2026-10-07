import { z } from 'zod'
import { dataValida } from '@/lib/datas'
import { MAX_CENTAVOS } from '@/lib/dinheiro'

export const lancamentoSchema = z.object({
  data: z.string().refine(dataValida, 'Data inválida.'),
  receitaCentavos: z.number().int().min(0).max(MAX_CENTAVOS),
  despesaCentavos: z.number().int().min(0).max(MAX_CENTAVOS),
})
