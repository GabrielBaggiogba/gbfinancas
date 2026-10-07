import type { Dados, Operacao, Tabela } from './tipos'

type Registro = Record<string, unknown> & { id: string }

/** Aplica as operações em uma cópia dos dados, com as mesmas cascatas do banco. */
export function aplicarLocal(dados: Dados, operacoes: Operacao[]): Dados {
  const m = { ...dados } as unknown as Record<Tabela, Registro[]>
  for (const o of operacoes) {
    if (o.op === 'inserir') {
      m[o.tabela] = [...m[o.tabela], ...(o.linhas as Registro[])]
    } else if (o.op === 'atualizar') {
      m[o.tabela] = m[o.tabela].map((l) => (l.id === o.id ? { ...l, ...o.campos, id: o.id } : l))
    } else {
      const alvo = new Set(o.ids)
      const tem = (v: unknown) => typeof v === 'string' && alvo.has(v)
      const anular = (tabela: Tabela, campo: string) => {
        m[tabela] = m[tabela].map((l) => (tem(l[campo]) ? { ...l, [campo]: null } : l))
      }
      if (o.tabela === 'contas') anular('recorrentes', 'conta_id')
      if (o.tabela === 'cartoes') anular('recorrentes', 'cartao_id')
      if (o.tabela === 'recorrentes') anular('lancamentos', 'recorrente_id')
      if (o.tabela === 'metas') m.aportes = m.aportes.filter((a) => !tem(a.meta_id))
      if (o.tabela === 'categorias') {
        m.categorias.filter((c) => tem(c.pai_id)).forEach((c) => alvo.add(c.id))
        anular('lancamentos', 'categoria_id')
        anular('recorrentes', 'categoria_id')
        m.orcamentos = m.orcamentos.filter((x) => !tem(x.categoria_id))
      }
      m[o.tabela] = m[o.tabela].filter((l) => !alvo.has(l.id))
    }
  }
  return m as unknown as Dados
}

/** Conta ou cartão com lançamentos não pode ser excluído (o banco também recusa). */
export function emUso(dados: Dados, tabela: 'contas' | 'cartoes', id: string): boolean {
  return dados.lancamentos.some((l) =>
    tabela === 'contas' ? l.conta_id === id || l.conta_destino_id === id : l.cartao_id === id,
  )
}
