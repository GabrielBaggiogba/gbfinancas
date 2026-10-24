import type { Dados } from '@/features/financas/tipos'

/** O que a IA precisa saber para escolher categoria, conta e cartão (só nomes e ids). */
export function contextoIA(dados: Dados) {
  return {
    categorias: dados.categorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      pai: c.pai_id,
    })),
    contas: dados.contas.filter((c) => !c.arquivada).map((c) => ({ id: c.id, nome: c.nome })),
    cartoes: dados.cartoes.filter((c) => !c.arquivado).map((c) => ({ id: c.id, nome: c.nome })),
  }
}
