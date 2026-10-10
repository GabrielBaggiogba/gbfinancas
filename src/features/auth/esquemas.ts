import { z } from 'zod'

export const credenciaisSchema = z.object({
  email: z.string().trim().toLowerCase().email('Digite um e-mail válido.'),
  senha: z
    .string()
    .min(6, 'A senha precisa ter pelo menos 6 caracteres.')
    .max(72, 'Senha longa demais.'),
})

// Só o cadastro exige 8: quem já tem conta com senha de 6 ou 7 continua entrando.
export const cadastroSchema = credenciaisSchema.extend({
  senha: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .max(72, 'Senha longa demais.'),
})

export type Credenciais = z.infer<typeof credenciaisSchema>
