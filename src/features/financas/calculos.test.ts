import { describe, expect, it } from 'vitest'
import {
  dividaDoCartao,
  dividirEmParcelas,
  faturaDe,
  faturasDoCartao,
  fluxoFuturo,
  gastosPorCategoria,
  nivelDoOrcamento,
  ocorrencias,
  patrimonio,
  progressoDaMeta,
  proximaData,
  resumoDoMes,
  saldosPorConta,
  usoDoOrcamento,
  vencimentoDaFatura,
} from './calculos'
import { DADOS_VAZIOS, type Cartao, type Dados, type Lancamento } from './tipos'

const agora = '2026-10-06T12:00:00.000Z'
const cartao: Cartao = {
  id: 'k1',
  nome: 'Azul',
  limite: 500000,
  dia_fechamento: 25,
  dia_vencimento: 5,
  arquivado: false,
  created_at: agora,
}
let n = 0
const l = (p: Partial<Lancamento> & Pick<Lancamento, 'tipo' | 'valor' | 'data'>): Lancamento => ({
  id: `l${n++}`,
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
  created_at: agora,
  ...p,
})
const base: Dados = {
  ...DADOS_VAZIOS,
  contas: [
    {
      id: 'a',
      nome: 'Principal',
      tipo: 'corrente',
      saldo_inicial: 100000,
      arquivada: false,
      created_at: agora,
    },
    {
      id: 'b',
      nome: 'Poupança',
      tipo: 'poupanca',
      saldo_inicial: 0,
      arquivada: false,
      created_at: agora,
    },
  ],
  cartoes: [cartao],
  categorias: [
    {
      id: 'c1',
      nome: 'Alimentação',
      tipo: 'despesa',
      icone: 'utensils',
      cor: '#d95926',
      pai_id: null,
      created_at: agora,
    },
    {
      id: 'c2',
      nome: 'Mercado',
      tipo: 'despesa',
      icone: 'cart',
      cor: '#d95926',
      pai_id: 'c1',
      created_at: agora,
    },
  ],
  lancamentos: [
    l({ tipo: 'receita', valor: 500000, data: '2026-10-05', conta_id: 'a' }),
    l({ tipo: 'despesa', valor: 20000, data: '2026-10-06', conta_id: 'a', categoria_id: 'c2' }),
    l({
      tipo: 'transferencia',
      valor: 50000,
      data: '2026-10-06',
      conta_id: 'a',
      conta_destino_id: 'b',
    }),
    l({ tipo: 'despesa', valor: 30000, data: '2026-10-02', cartao_id: 'k1', categoria_id: 'c1' }),
    l({ tipo: 'despesa', valor: 10000, data: '2026-10-28', cartao_id: 'k1' }),
  ],
}

describe('contas e patrimônio', () => {
  it('transferência não muda o total, só move entre contas', () => {
    const s = saldosPorConta(base, '2026-10-06')
    expect(s.get('a')).toBe(100000 + 500000 - 20000 - 50000)
    expect(s.get('b')).toBe(50000)
  })
  it('patrimônio desconta o que já foi comprado no cartão', () => {
    expect(patrimonio(base, '2026-10-06')).toBe(580000 - 30000)
  })
  it('resumo do mês conta compra no cartão como saída e ignora transferência', () => {
    const r = resumoDoMes(base, '2026-10')
    expect(r.entradas).toBe(500000)
    expect(r.saidas).toBe(60000)
    expect(r.taxaEconomia).toBeCloseTo(0.88)
  })
  it('subcategoria soma na categoria-mãe', () => {
    const fatias = gastosPorCategoria(base, '2026-10-01', '2026-10-31')
    expect(fatias[0]).toMatchObject({ id: 'c1', total: 50000 })
  })
})

describe('cartão', () => {
  it('compra depois do fechamento cai na fatura seguinte', () => {
    expect(faturaDe(cartao, '2026-10-25')).toBe('2026-10')
    expect(faturaDe(cartao, '2026-10-26')).toBe('2026-11')
    expect(vencimentoDaFatura(cartao, '2026-10')).toBe('2026-11-05')
  })
  it('monta faturas, status e pagamento', () => {
    const faturas = faturasDoCartao(cartao, base.lancamentos, '2026-10-06')
    expect(faturas.map((f) => [f.ref, f.total, f.status])).toEqual([
      ['2026-10', 30000, 'aberta'],
      ['2026-11', 10000, 'futura'],
    ])
    const pago = [
      ...base.lancamentos,
      l({
        tipo: 'pagamento_fatura',
        valor: 30000,
        data: '2026-11-05',
        conta_id: 'a',
        cartao_id: 'k1',
        fatura_ref: '2026-10',
      }),
    ]
    expect(faturasDoCartao(cartao, pago, '2026-11-10')[0].status).toBe('paga')
    expect(faturasDoCartao(cartao, base.lancamentos, '2026-11-10')[0].status).toBe('atrasada')
    expect(dividaDoCartao('k1', pago)).toBe(10000)
  })
  it('divide parcelas sem perder centavos', () => {
    const p = dividirEmParcelas(10000, 3)
    expect(p).toEqual([3334, 3333, 3333])
    expect(p.reduce((a, b) => a + b, 0)).toBe(10000)
  })
})

describe('planejamento', () => {
  it('orçamento por categoria inclui subcategorias e avisa em 70, 90 e 100%', () => {
    const uso = usoDoOrcamento(
      { id: 'o', categoria_id: 'c1', valor: 100000, created_at: agora },
      base,
      '2026-10',
    )
    expect(uso.usado).toBe(50000)
    expect(uso.nivel).toBe('ok')
    expect([0.69, 0.7, 0.9, 1].map(nivelDoOrcamento)).toEqual([
      'ok',
      'atencao',
      'alerta',
      'estourado',
    ])
  })
  it('meta calcula percentual, restante e ritmo mensal', () => {
    const dados: Dados = {
      ...base,
      aportes: [
        {
          id: 'x',
          meta_id: 'm',
          valor: 250000,
          data: '2026-09-01',
          observacao: '',
          created_at: agora,
        },
      ],
    }
    const p = progressoDaMeta(
      {
        id: 'm',
        nome: 'Viagem',
        valor_alvo: 1000000,
        prazo: '2027-01-06',
        icone: 'plane',
        cor: '#3987e5',
        created_at: agora,
      },
      dados,
      '2026-10-06',
    )
    expect(p.pct).toBe(0.25)
    expect(p.restante).toBe(750000)
    expect(p.porMes).toBe(Math.ceil(750000 / 4))
  })
  it('recorrência mensal segura o fim do mês', () => {
    expect(proximaData('2026-01-31', 'mensal')).toBe('2026-02-28')
    expect(proximaData('2026-10-06', 'semanal')).toBe('2026-10-13')
    const r = {
      id: 'r',
      tipo: 'despesa' as const,
      descricao: 'Aluguel',
      valor: 180000,
      categoria_id: null,
      conta_id: 'a',
      cartao_id: null,
      frequencia: 'mensal' as const,
      proximo_vencimento: '2026-10-10',
      ativo: true,
      created_at: agora,
    }
    expect(ocorrencias(r, '2026-12-31')).toEqual(['2026-10-10', '2026-11-10', '2026-12-10'])
  })
  it('fluxo futuro soma recorrentes e desconta faturas no vencimento', () => {
    const dados: Dados = {
      ...base,
      recorrentes: [
        {
          id: 'r',
          tipo: 'despesa',
          descricao: 'Aluguel',
          valor: 180000,
          categoria_id: null,
          conta_id: 'a',
          cartao_id: null,
          frequencia: 'mensal',
          proximo_vencimento: '2026-10-10',
          ativo: true,
          created_at: agora,
        },
      ],
    }
    const pontos = fluxoFuturo(dados, '2026-10-06', 31)
    const em = (d: string) => pontos.find((p) => p.data === d)!.saldo
    expect(em('2026-10-06')).toBe(580000)
    expect(em('2026-10-10')).toBe(400000)
    expect(em('2026-11-05')).toBe(400000 - 30000)
  })
})
