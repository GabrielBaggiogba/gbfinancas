export type AtivoEmAlta = {
  codigo: string
  nome: string | null
  /** Variação no período, em pontos percentuais (4.32 = +4,32%). Sempre positiva. */
  variacao: number
}

/**
 * `nao-configurado`: nenhuma API ligada. `falha`: a API não respondeu ou mandou algo
 * inválido ou antigo. `sem-altas`: a API respondeu, mas nenhum ativo subiu no período.
 */
export type MotivoIndisponivel = 'nao-configurado' | 'falha' | 'sem-altas'

export type Destaques =
  | {
      situacao: 'ok'
      ativos: AtivoEmAlta[]
      /** Primeiro e último dia do período (AAAA-MM-DD). */
      inicio: string
      fim: string
      fonte: string
      /** ISO 8601. */
      atualizado_em: string
    }
  | { situacao: 'indisponivel'; motivo: MotivoIndisponivel }
