'use server'

import { z } from 'zod'
import { obterUsuario } from '@/features/auth/sessao'
import { ErroDeIA } from '@/features/ia/ler'
import { perguntarAoGrao } from './perguntar'

const entradaSchema = z.object({
  resumo: z.string().max(80_000),
  historico: z
    .array(
      z.object({ papel: z.enum(['pessoa', 'grao']), texto: z.string().trim().min(1).max(2000) }),
    )
    .min(1)
    .max(20),
})

type Resultado = { ok: true; resposta: string } | { ok: false; mensagem: string }

/** Pergunta ao Grão sobre as próprias finanças. A conversa começa e termina com a pessoa. */
export async function perguntar(dados: unknown): Promise<Resultado> {
  if (!(await obterUsuario())) return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' }
  const r = entradaSchema.safeParse(dados)
  if (!r.success) return { ok: false, mensagem: 'Pergunta grande demais.' }
  const historico = r.data.historico
  if (historico[0].papel !== 'pessoa' || historico[historico.length - 1].papel !== 'pessoa')
    return { ok: false, mensagem: 'Conversa inválida.' }
  try {
    return { ok: true, resposta: await perguntarAoGrao(r.data.resumo, historico) }
  } catch (e) {
    return { ok: false, mensagem: e instanceof ErroDeIA ? e.message : 'Não consegui responder.' }
  }
}
