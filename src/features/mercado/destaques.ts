import { z } from 'zod'
import { dataValida, diasEntre } from '@/lib/datas'
import type { AtivoEmAlta, Destaques } from './tipos'

// Confere e ordena o que a API de cotações devolve. Nenhum número nasce aqui: o que
// não passar na conferência vira "indisponível" em vez de aparecer na faixa.

/** Quantos ativos a faixa mostra. */
export const MAXIMO_DE_ATIVOS = 12
/** O período informado pela API precisa caber em uma semana. */
const DIAS_DO_PERIODO = 7
/** Passado isso do fim do período, os dados já não são "da semana". */
const DIAS_DE_VALIDADE = 7

const dia = z.string().refine(dataValida)

const resposta = z.object({
  fonte: z.string().trim().min(1).max(60).optional(),
  inicio: dia,
  fim: dia,
  atualizado_em: z.string().datetime({ offset: true }),
  ativos: z.array(z.unknown()).max(1000),
})

const ativo = z.object({
  codigo: z.string().trim().min(1).max(12),
  nome: z.string().trim().max(60).nullish(),
  variacao: z.number().finite(),
})

const FALHA: Destaques = { situacao: 'indisponivel', motivo: 'falha' }

/**
 * "Em alta na semana" são os ativos com maior variação percentual positiva no período
 * informado pela API, do maior para o menor.
 */
export function normalizar(
  bruto: unknown,
  { fontePadrao, hoje }: { fontePadrao: string; hoje: string },
): Destaques {
  const r = resposta.safeParse(bruto)
  if (!r.success) return FALHA
  const { inicio, fim, atualizado_em } = r.data

  const duracao = diasEntre(inicio, fim)
  if (duracao < 1 || duracao > DIAS_DO_PERIODO) return FALHA
  if (diasEntre(fim, hoje) > DIAS_DE_VALIDADE) return FALHA

  const porCodigo = new Map<string, AtivoEmAlta>()
  for (const item of r.data.ativos) {
    const a = ativo.safeParse(item)
    if (!a.success || a.data.variacao <= 0) continue
    const codigo = a.data.codigo.toUpperCase()
    const anterior = porCodigo.get(codigo)
    if (anterior && anterior.variacao >= a.data.variacao) continue
    porCodigo.set(codigo, { codigo, nome: a.data.nome || null, variacao: a.data.variacao })
  }
  if (porCodigo.size === 0) return { situacao: 'indisponivel', motivo: 'sem-altas' }

  const ativos = Array.from(porCodigo.values())
    .sort((a, b) => b.variacao - a.variacao || a.codigo.localeCompare(b.codigo))
    .slice(0, MAXIMO_DE_ATIVOS)
  return {
    situacao: 'ok',
    ativos,
    inicio,
    fim,
    fonte: r.data.fonte ?? fontePadrao,
    atualizado_em,
  }
}

/** "+4,32%" */
export function formatarAlta(variacao: number): string {
  const numero = variacao.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `+${numero}%`
}
