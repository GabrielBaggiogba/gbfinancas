import 'server-only'
import { centavosParaReais, reaisParaCentavos } from '@/lib/dinheiro'
import { criarClienteServidor } from '@/lib/supabase/server'
import type { RepositorioLancamentos } from './repositorio'
import type { Lancamento } from './tipos'

type Linha = { data: string; valor_receita: number | string; valor_despesa: number | string }

function paraLancamento(l: Linha): Lancamento {
  return {
    data: l.data,
    receitaCentavos: reaisParaCentavos(l.valor_receita),
    despesaCentavos: reaisParaCentavos(l.valor_despesa),
  }
}

export function repositorioSupabase(): RepositorioLancamentos {
  return {
    async listarPeriodo(inicio, fim) {
      const supabase = criarClienteServidor()
      const { data, error } = await supabase
        .from('lancamentos_diarios')
        .select('data, valor_receita, valor_despesa')
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: false })
      if (error) throw error
      return (data ?? []).map(paraLancamento)
    },

    async salvar(usuarioId, l) {
      const supabase = criarClienteServidor()
      const { data, error } = await supabase
        .from('lancamentos_diarios')
        .upsert(
          {
            user_id: usuarioId,
            data: l.data,
            valor_receita: centavosParaReais(l.receitaCentavos),
            valor_despesa: centavosParaReais(l.despesaCentavos),
          },
          { onConflict: 'user_id,data' },
        )
        .select('data, valor_receita, valor_despesa')
        .single()
      if (error) throw error
      return paraLancamento(data)
    },
  }
}
