import 'server-only'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Item } from 'pluggy-sdk'
import { ESQUEMAS } from '@/features/financas/esquemas'
import { hojeEmSaoPaulo, somarDias } from '@/lib/datas'
import { clienteAdmin } from '@/lib/supabase/admin'
import {
  dadosDoCartao,
  ehCartao,
  lancamentoPara,
  nomeDaConta,
  type CategoriaSimples,
  type ContaDoBanco,
  type Destino,
  type TransacaoDoBanco,
} from './mapear'
import { clientePluggy } from './pluggy'

type Conexao = { id: string; user_id: string; item_id: string; ultima_sincronizacao: string | null }

export function statusDaConexao(item: Pick<Item, 'status' | 'executionStatus'>) {
  if (item.status === 'UPDATED') return 'ok' as const
  if (item.status === 'UPDATING') return 'atualizando' as const
  if (item.status === 'LOGIN_ERROR' || item.status === 'WAITING_USER_INPUT')
    return 'reconectar' as const
  return /AUTHORIZATION|CREDENTIALS|ACCOUNT_NEEDS_ACTION/.test(item.executionStatus)
    ? ('reconectar' as const)
    : ('erro' as const)
}

/**
 * Traz contas, cartões e lançamentos de uma conexão para as finanças do dono.
 * Usa a chave service_role (roda sem sessão), então tudo é filtrado pelo user_id da conexão.
 * Repetir é seguro: o id do banco (`externo_id`) impede lançamento em dobro.
 */
export async function sincronizarConexao(itemId: string): Promise<{ novos: number } | null> {
  const admin = clienteAdmin()
  const { data: conexao } = await admin
    .from('conexoes_bancarias')
    .select('id, user_id, item_id, ultima_sincronizacao')
    .eq('item_id', itemId)
    .maybeSingle<Conexao>()
  if (!conexao) return null
  const pluggy = clientePluggy()
  const dono = conexao.user_id

  const item = await pluggy.fetchItem(itemId)
  const status = statusDaConexao(item)
  await admin
    .from('conexoes_bancarias')
    .update({
      instituicao: item.connector?.name ?? '',
      logo: item.connector?.imageUrl ?? null,
      cor: item.connector?.primaryColor ? `#${item.connector.primaryColor.replace('#', '')}` : null,
      status,
      detalhe: status === 'ok' || status === 'atualizando' ? null : item.executionStatus,
      consentimento_expira: item.consentExpiresAt ?? null,
    })
    .eq('id', conexao.id)
  if (status !== 'ok') return { novos: 0 }

  const instituicao = item.connector?.name ?? 'Banco'
  const contasDoBanco = (await pluggy.fetchAccounts(itemId)).results as unknown as ContaDoBanco[]
  const { data: cats } = await admin.from('categorias').select('id, nome, tipo').eq('user_id', dono)
  const categorias = (cats ?? []) as CategoriaSimples[]
  const hoje = hojeEmSaoPaulo()
  // Primeira vez: últimos 90 dias. Depois: desde a última, com folga para o que o banco atrasou.
  const desde = conexao.ultima_sincronizacao
    ? somarDias(hojeEmSaoPaulo(new Date(conexao.ultima_sincronizacao)), -10)
    : somarDias(hoje, -90)

  // Garante uma conta ou cartão do app para cada conta do banco.
  const destinos = new Map<string, Destino & { nova: boolean }>()
  for (const c of contasDoBanco) {
    const tabela = ehCartao(c) ? 'cartoes' : 'contas'
    const { data: existente } = await admin
      .from(tabela)
      .select('id')
      .eq('user_id', dono)
      .eq('externo_id', c.id)
      .maybeSingle<{ id: string }>()
    if (existente) {
      destinos.set(c.id, { tipo: ehCartao(c) ? 'cartao' : 'conta', id: existente.id, nova: false })
      continue
    }
    const id = randomUUID()
    const nome = nomeDaConta(c, instituicao)
    const linha: Record<string, unknown> = ehCartao(c)
      ? { id, user_id: dono, externo_id: c.id, nome, ...paraReais(dadosDoCartao(c), ['limite']) }
      : {
          id,
          user_id: dono,
          externo_id: c.id,
          nome,
          tipo: c.subtype === 'SAVINGS_ACCOUNT' ? 'poupanca' : 'corrente',
          saldo_inicial: 0,
        }
    const { error } = await admin.from(tabela).insert(linha)
    if (error) throw new Error(`criar ${tabela}: ${error.message}`)
    destinos.set(c.id, { tipo: ehCartao(c) ? 'cartao' : 'conta', id, nova: true })
  }

  const cartaoDaFatura = [...destinos.values()].find((d) => d.tipo === 'cartao')?.id ?? null
  let novos = 0
  for (const c of contasDoBanco) {
    const destino = destinos.get(c.id)!
    const transacoes = (await pluggy.fetchAllTransactions(c.id, {
      dateFrom: desde,
    })) as unknown as TransacaoDoBanco[]
    const linhas = transacoes.flatMap((t) => {
      const l = lancamentoPara(t, destino, categorias, cartaoDaFatura)
      if (!l) return []
      const completo = { ...l, id: randomUUID() }
      if (!ESQUEMAS.lancamentos.safeParse(completo).success) return []
      return [{ ...completo, valor: completo.valor / 100, user_id: dono, externo_id: t.id }]
    })
    for (let i = 0; i < linhas.length; i += 500) {
      const { data, error } = await admin
        .from('lancamentos')
        .upsert(linhas.slice(i, i + 500), {
          onConflict: 'user_id,externo_id',
          ignoreDuplicates: true,
        })
        .select('id')
      if (error) throw new Error(`lançamentos: ${error.message}`)
      novos += data?.length ?? 0
    }

    // Conta nova: o saldo inicial faz o app bater com o saldo de hoje no banco.
    if (destino.nova && destino.tipo === 'conta') {
      const liquido = linhas.reduce(
        (s, l) =>
          s +
          (l.tipo === 'receita' ? 1 : -1) * Math.round(l.valor * 100) * (l.data <= hoje ? 1 : 0),
        0,
      )
      const inicial = Math.round(c.balance * 100) - liquido
      await admin
        .from('contas')
        .update({ saldo_inicial: inicial / 100 })
        .eq('id', destino.id)
        .eq('user_id', dono)
    }
  }

  await admin
    .from('conexoes_bancarias')
    .update({ ultima_sincronizacao: new Date().toISOString() })
    .eq('id', conexao.id)
  return { novos }
}

function paraReais<T extends Record<string, number>>(dados: T, campos: (keyof T)[]) {
  const saida: Record<string, number> = { ...dados }
  for (const c of campos) saida[c as string] = dados[c] / 100
  return saida
}

/** Todas as conexões (agendamento diário). */
export async function sincronizarTodas(): Promise<{
  conexoes: number
  novos: number
  falhas: number
}> {
  const admin: SupabaseClient = clienteAdmin()
  const { data } = await admin.from('conexoes_bancarias').select('item_id')
  let novos = 0
  let falhas = 0
  for (const c of data ?? []) {
    try {
      novos += (await sincronizarConexao(c.item_id))?.novos ?? 0
    } catch (e) {
      falhas++
      console.error('[bancos]', c.item_id, e instanceof Error ? e.message : e)
    }
  }
  return { conexoes: data?.length ?? 0, novos, falhas }
}
