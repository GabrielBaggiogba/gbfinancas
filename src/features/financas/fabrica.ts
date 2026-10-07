import { somarMeses } from '@/lib/datas'
import { dividirEmParcelas, proximaData } from './calculos'
import { novoId } from './padroes'
import type { Categoria, Dados, Lancamento, Operacao, Recorrente } from './tipos'

export function lancamentoVazio(
  parcial: Partial<Lancamento> & Pick<Lancamento, 'tipo' | 'data'>,
): Lancamento {
  return {
    id: novoId(),
    valor: 0,
    descricao: '',
    categoria_id: null,
    conta_id: null,
    conta_destino_id: null,
    cartao_id: null,
    forma_pagamento: null,
    observacao: '',
    parcela_atual: null,
    parcela_total: null,
    grupo_id: null,
    recorrente_id: null,
    fatura_ref: null,
    created_at: new Date().toISOString(),
    ...parcial,
  }
}

/** Uma compra parcelada vira um lançamento por mês, todos com o mesmo grupo. */
export function parcelar(base: Lancamento, parcelas: number): Lancamento[] {
  if (parcelas <= 1) return [{ ...base, parcela_atual: null, parcela_total: null, grupo_id: null }]
  const grupo = novoId()
  return dividirEmParcelas(base.valor, parcelas).map((valor, i) => ({
    ...base,
    id: i === 0 ? base.id : novoId(),
    valor,
    data: somarMeses(base.data, i),
    parcela_atual: i + 1,
    parcela_total: parcelas,
    grupo_id: grupo,
  }))
}

/** Categorias em ordem de exibição: mãe seguida das filhas ("Alimentação › Mercado"). */
export function categoriasOrdenadas(categorias: Categoria[], tipo?: 'receita' | 'despesa') {
  const lista = categorias.filter((c) => !tipo || c.tipo === tipo)
  const raizes = lista
    .filter((c) => !c.pai_id)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return raizes.flatMap((r) => [
    { ...r, rotulo: r.nome },
    ...lista
      .filter((c) => c.pai_id === r.id)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((c) => ({ ...c, rotulo: `${r.nome} › ${c.nome}` })),
  ])
}

export function nomeDaCategoria(id: string | null, categorias: Categoria[]): string {
  const c = categorias.find((x) => x.id === id)
  if (!c) return 'Sem categoria'
  const pai = c.pai_id ? categorias.find((x) => x.id === c.pai_id) : null
  return pai ? `${pai.nome} › ${c.nome}` : c.nome
}

/** De onde saiu ou para onde foi o dinheiro, em texto curto. */
export function origemDoLancamento(l: Lancamento, dados: Dados): string {
  const conta = (id: string | null) =>
    dados.contas.find((c) => c.id === id)?.nome ?? 'Conta removida'
  const cartao = (id: string | null) =>
    dados.cartoes.find((c) => c.id === id)?.nome ?? 'Cartão removido'
  if (l.tipo === 'transferencia') return `${conta(l.conta_id)} → ${conta(l.conta_destino_id)}`
  if (l.tipo === 'pagamento_fatura') return `${conta(l.conta_id)} → ${cartao(l.cartao_id)}`
  return l.cartao_id ? cartao(l.cartao_id) : conta(l.conta_id)
}

export function tituloDoLancamento(l: Lancamento, dados: Dados): string {
  const base =
    l.descricao ||
    (l.tipo === 'transferencia'
      ? 'Transferência'
      : l.tipo === 'pagamento_fatura'
        ? 'Pagamento de fatura'
        : nomeDaCategoria(l.categoria_id, dados.categorias))
  return l.parcela_total ? `${base} (${l.parcela_atual}/${l.parcela_total})` : base
}

/** Marca um recorrente como pago ou recebido: cria o lançamento e avança o vencimento. */
export function operacoesDoRecorrente(
  r: Recorrente,
  data: string,
  contaPadrao: string | null,
): Operacao[] {
  const noCartao = r.tipo === 'despesa' && !!r.cartao_id
  const conta = noCartao ? null : (r.conta_id ?? contaPadrao)
  const operacoes: Operacao[] = []
  if (noCartao || conta) {
    operacoes.push({
      op: 'inserir',
      tabela: 'lancamentos',
      linhas: [
        lancamentoVazio({
          tipo: r.tipo,
          data,
          valor: r.valor,
          descricao: r.descricao,
          categoria_id: r.categoria_id,
          conta_id: conta,
          cartao_id: noCartao ? r.cartao_id : null,
          forma_pagamento: noCartao ? 'credito' : r.tipo === 'receita' ? 'transferencia' : 'boleto',
          recorrente_id: r.id,
        }),
      ],
    })
  }
  operacoes.push({
    op: 'atualizar',
    tabela: 'recorrentes',
    id: r.id,
    campos: { proximo_vencimento: proximaData(r.proximo_vencimento, r.frequencia) },
  })
  return operacoes
}
