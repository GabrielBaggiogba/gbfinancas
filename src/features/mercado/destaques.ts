import { z } from 'zod'
import { dataValida, diasEntre } from '@/lib/datas'

// Destaques da semana: os ativos com maior alta percentual no período semanal.
//
// O app não tem cotações próprias e não lê páginas de terceiros. Os dados vêm de
// uma API configurada em GBF_DESTAQUES_URL, que responde no formato abaixo
// (documentado também no README). O app só filtra, ordena e exibe.

const data = z.string().refine(dataValida, 'data no formato AAAA-MM-DD')

const ativo = z
  .object({
    codigo: z.string().trim().min(1).max(20),
    nome: z.string().trim().max(80).optional(),
    /** Fechamento no início do período (último pregão antes da semana). */
    fechamento_inicial: z.number().positive().finite().optional(),
    /** Fechamento no fim do período. */
    fechamento_final: z.number().positive().finite().optional(),
    /** Variação já calculada pela fonte, em %. Usada só sem os dois fechamentos. */
    variacao_pct: z.number().finite().optional(),
  })
  .refine(
    (a) =>
      (a.fechamento_inicial !== undefined && a.fechamento_final !== undefined) ||
      a.variacao_pct !== undefined,
    'informe fechamento_inicial e fechamento_final, ou variacao_pct',
  )

export const esquemaRespostaDestaques = z.object({
  fonte: z.string().trim().min(1).max(80),
  periodo: z.object({ inicio: data, fim: data }),
  atualizado_em: z.string().datetime({ offset: true }),
  ativos: z.array(ativo).max(2000),
})

export type RespostaDestaques = z.infer<typeof esquemaRespostaDestaques>

export type Destaque = { codigo: string; nome: string | null; variacao_pct: number }

export type Destaques =
  | {
      situacao: 'ok'
      fonte: string
      periodo: { inicio: string; fim: string }
      atualizado_em: string
      itens: Destaque[]
    }
  | {
      situacao: 'sem-alta'
      fonte: string
      periodo: { inicio: string; fim: string }
      atualizado_em: string
      itens: []
    }
  | { situacao: 'indisponivel'; motivo: 'nao-configurado' | 'falhou' }

/** Quantos ativos a faixa mostra. */
export const LIMITE_DESTAQUES = 10
/** Semana: de 1 a 7 dias corridos entre o início e o fim do período. */
export const DIAS_MAX_PERIODO = 7

/**
 * Valida a resposta da API e escolhe os destaques: só variação positiva, da maior
 * para a menor, com no máximo `limite` ativos. Um código repetido conta uma vez.
 */
export function calcularDestaques(
  bruto: unknown,
  opcoes: { fonte?: string; limite?: number } = {},
): Destaques {
  const lido = esquemaRespostaDestaques.safeParse(bruto)
  if (!lido.success) throw new Error(`Resposta fora do formato: ${lido.error.issues[0]?.message}`)
  const { periodo, atualizado_em, ativos } = lido.data

  const dias = diasEntre(periodo.inicio, periodo.fim)
  if (dias < 1 || dias > DIAS_MAX_PERIODO)
    throw new Error(`Período de ${dias} dias; o esperado é uma semana (1 a 7 dias).`)

  const vistos = new Set<string>()
  const itens: Destaque[] = []
  for (const a of ativos) {
    const codigo = a.codigo.toUpperCase()
    if (vistos.has(codigo)) continue
    vistos.add(codigo)
    const variacao =
      a.fechamento_inicial !== undefined && a.fechamento_final !== undefined
        ? (a.fechamento_final / a.fechamento_inicial - 1) * 100
        : (a.variacao_pct as number)
    const arredondada = Math.round(variacao * 100) / 100
    if (arredondada > 0) itens.push({ codigo, nome: a.nome || null, variacao_pct: arredondada })
  }
  itens.sort((x, y) => y.variacao_pct - x.variacao_pct || x.codigo.localeCompare(y.codigo))

  const base = {
    fonte: opcoes.fonte?.trim() || lido.data.fonte,
    periodo,
    atualizado_em: new Date(atualizado_em).toISOString(),
  }
  if (itens.length === 0) return { situacao: 'sem-alta', ...base, itens: [] }
  return {
    situacao: 'ok',
    ...base,
    itens: itens.slice(0, opcoes.limite ?? LIMITE_DESTAQUES),
  }
}

/** 6.3 -> "+6,30%" */
export function formatarVariacao(p: number): string {
  const texto = Math.abs(p).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${p < 0 ? '−' : '+'}${texto}%`
}
