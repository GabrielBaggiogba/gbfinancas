import {
  faturasDoCartao,
  mesDaFatura,
  gastosPorCategoria,
  patrimonio,
  progressoDaMeta,
  proximosVencimentos,
  resumoDoMes,
  saldoProjetadoFimDoMes,
  saldosPorConta,
  usoDoOrcamento,
} from '@/features/financas/calculos'
import { nomeDaCategoria, origemDoLancamento } from '@/features/financas/fabrica'
import type { Dados } from '@/features/financas/tipos'
import { diasEntre, fimDoMes, inicioDoMes, mesDe, rotuloMes, somarMesRef } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'

const r = formatarReais

/**
 * Retrato das finanças em texto, para o assistente responder perguntas. Só números já
 * calculados pelo app e os lançamentos recentes; nada sai daqui sem a pessoa perguntar.
 */
export function resumoParaAssistente(dados: Dados, hoje: string): string {
  const mes = mesDe(hoje)
  const saldos = saldosPorConta(dados, hoje)
  const contas = dados.contas.filter((c) => !c.arquivada)
  const linhas: string[] = []

  linhas.push(
    `Hoje: ${hoje}. Mês atual: ${rotuloMes(mes)} (faltam ${diasEntre(hoje, fimDoMes(mes))} dias).`,
  )
  linhas.push('', '## Contas')
  for (const c of contas) linhas.push(`- ${c.nome} (${c.tipo}): ${r(saldos.get(c.id) ?? 0)}`)
  linhas.push(`Patrimônio (contas menos faturas em aberto): ${r(patrimonio(dados, hoje))}`)
  linhas.push(
    `Saldo projetado no fim do mês (com contas a pagar e a receber): ${r(saldoProjetadoFimDoMes(dados, hoje))}`,
  )

  const cartoes = dados.cartoes.filter((c) => !c.arquivado)
  if (cartoes.length) {
    linhas.push('', '## Cartões de crédito')
    for (const c of cartoes) {
      const abertas = faturasDoCartao(c, dados.lancamentos, hoje).filter(
        (f) => f.restante > 0 && f.status !== 'paga',
      )
      const faturas = abertas
        .slice(0, 3)
        .map(
          (f) =>
            `fatura de ${rotuloMes(mesDaFatura(c, f.ref))} ${r(f.restante)} vence ${f.vencimento} (${f.status})`,
        )
        .join('; ')
      linhas.push(`- ${c.nome}: limite ${r(c.limite)}. Faturas: ${faturas || 'nenhuma em aberto'}`)
    }
  }

  linhas.push('', '## Últimos 6 meses (entradas / saídas / sobra)')
  for (let i = 5; i >= 0; i--) {
    const ref = somarMesRef(mes, -i)
    const m = resumoDoMes(dados, ref)
    linhas.push(`- ${rotuloMes(ref)}: ${r(m.entradas)} / ${r(m.saidas)} / ${r(m.saldo)}`)
  }

  for (const ref of [mes, somarMesRef(mes, -1)]) {
    const fatias = gastosPorCategoria(dados, inicioDoMes(ref), fimDoMes(ref)).slice(0, 10)
    if (!fatias.length) continue
    linhas.push('', `## Gastos por categoria em ${rotuloMes(ref)}`)
    for (const f of fatias) linhas.push(`- ${f.nome}: ${r(f.total)}`)
  }

  if (dados.orcamentos.length) {
    linhas.push('', '## Limites de gastos do mês')
    for (const o of dados.orcamentos) {
      const u = usoDoOrcamento(o, dados, mes)
      const nome = o.categoria_id ? nomeDaCategoria(o.categoria_id, dados.categorias) : 'Geral'
      linhas.push(`- ${nome}: usou ${r(u.usado)} de ${r(o.valor)} (${Math.round(u.pct * 100)}%)`)
    }
  }

  if (dados.metas.length) {
    linhas.push('', '## Metas')
    for (const m of dados.metas) {
      const p = progressoDaMeta(m, dados, hoje)
      const prazo = m.prazo ? `, prazo ${m.prazo}` : ''
      const porMes = p.porMes ? `, guardar ${r(p.porMes)}/mês` : ''
      linhas.push(`- ${m.nome}: ${r(p.acumulado)} de ${r(m.valor_alvo)}${prazo}${porMes}`)
    }
  }

  const proximos = proximosVencimentos(dados, hoje, 30)
  if (proximos.length) {
    linhas.push('', '## Próximos 30 dias (contas a pagar e a receber)')
    for (const v of proximos.slice(0, 30))
      linhas.push(
        `- ${v.data} ${v.entrada ? 'entra' : 'sai'} ${r(v.valor)}: ${v.titulo}${v.atrasado ? ' (atrasado)' : ''}`,
      )
  }

  const recentes = [...dados.lancamentos]
    .filter((l) => l.data <= hoje && l.data >= inicioDoMes(somarMesRef(mes, -2)))
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, 200)
  if (recentes.length) {
    linhas.push(
      '',
      '## Lançamentos recentes (data | tipo | descrição | categoria | conta ou cartão | valor)',
    )
    for (const l of recentes)
      linhas.push(
        `${l.data} | ${l.tipo} | ${l.descricao || '-'} | ${nomeDaCategoria(l.categoria_id, dados.categorias)} | ${origemDoLancamento(l, dados)} | ${r(l.valor)}`,
      )
  }
  return linhas.join('\n')
}
