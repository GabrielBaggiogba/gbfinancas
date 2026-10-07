'use server'

import { revalidatePath } from 'next/cache'
import { obterUsuario } from '@/features/auth/sessao'
import { hojeEmSaoPaulo, inicioDaJanela } from '@/lib/datas'
import { lancamentoSchema } from './esquemas'
import { obterRepositorio } from './repositorio'
import type { Lancamento } from './tipos'

export type ResultadoSalvar = { ok: true; lancamento: Lancamento } | { ok: false; mensagem: string }

export async function salvarLancamento(entrada: unknown): Promise<ResultadoSalvar> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' }

  const analise = lancamentoSchema.safeParse(entrada)
  if (!analise.success) return { ok: false, mensagem: analise.error.issues[0].message }
  const lancamento = analise.data

  const hoje = hojeEmSaoPaulo()
  if (lancamento.data < inicioDaJanela(hoje) || lancamento.data > hoje) {
    return { ok: false, mensagem: 'Só é possível anotar os últimos 30 dias.' }
  }

  let salvo: Lancamento
  try {
    salvo = await obterRepositorio().salvar(usuario.id, lancamento)
  } catch {
    return { ok: false, mensagem: 'Não foi possível salvar. Tente de novo.' }
  }

  revalidatePath('/')
  return { ok: true, lancamento: salvo }
}
