import { z } from 'zod'

export const credenciaisSchema = z.object({
  email: z.string().trim().toLowerCase().email('Digite um e-mail válido.'),
  senha: z
    .string()
    .min(6, 'A senha precisa ter pelo menos 6 caracteres.')
    .max(72, 'Senha longa demais.'),
})

export type Credenciais = z.infer<typeof credenciaisSchema>
