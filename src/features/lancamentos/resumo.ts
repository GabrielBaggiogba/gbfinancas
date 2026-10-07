import { listarDias } from '@/lib/datas'
import type { Lancamento } from './tipos'

export type Resumo = { entradas: number; saidas: number; saldo: number }

export function temRegistro(l: Lancamento | undefined | null): l is Lancamento {
  return !!l && (l.receitaCentavos > 0 || l.despesaCentavos > 0)
}

/** Soma em centavos inteiros os dias entre `inicio` e `fim`, inclusive. */
export function calcularResumo(lista: Lancamento[], inicio: string, fim: string): Resumo {
  let entradas = 0
  let saidas = 0
  for (const l of lista) {
    if (l.data < inicio || l.data > fim) continue
    entradas += l.receitaCentavos
    saidas += l.despesaCentavos
  }
  return { entradas, saidas, saldo: entradas - saidas }
}

export type LinhaDia = { data: string; lancamento: Lancamento | null }

/** De hoje até o registro mais antigo da janela; vazio se não há registro. */
export function montarLinhas(mapa: Map<string, Lancamento>, hoje: string): LinhaDia[] {
  let maisAntigo: string | null = null
  for (const l of Array.from(mapa.values())) {
    if (l.data > hoje || !temRegistro(l)) continue
    if (maisAntigo === null || l.data < maisAntigo) maisAntigo = l.data
  }
  if (maisAntigo === null) return []
  return listarDias(maisAntigo, hoje).map((data) => ({
    data,
    lancamento: temRegistro(mapa.get(data)) ? (mapa.get(data) ?? null) : null,
  }))
}
