import 'server-only'
import { randomUUID } from 'node:crypto'
import { dataNoMes, mesDe, somarDias, somarMeses, somarMesRef } from '@/lib/datas'
import { dividirEmParcelas, faturasDoCartao } from '../calculos'
import { CATEGORIAS_PADRAO, CORES } from '../padroes'
import type { Categoria, Dados, FormaPagamento, Lancamento } from '../tipos'

// Dados de exemplo do modo demonstração. Gerador com semente fixa: o mesmo dia
// produz sempre os mesmos lançamentos.
function sorteador(semente: number) {
  let a = semente
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function dadosDeExemplo(hoje: string): Dados {
  const rnd = sorteador(20261006)
  const entre = (min: number, max: number) => Math.round(min + rnd() * (max - min))
  const agora = `${hoje}T12:00:00.000Z`
  const id = () => randomUUID()

  const contas = [
    { id: id(), nome: 'Conta principal', tipo: 'corrente' as const, saldo_inicial: 240000 },
    { id: id(), nome: 'Carteira', tipo: 'dinheiro' as const, saldo_inicial: 95000 },
    { id: id(), nome: 'Poupança', tipo: 'poupanca' as const, saldo_inicial: 1250000 },
  ].map((c) => ({ ...c, arquivada: false, created_at: agora }))
  const [principal, carteira, poupanca] = contas

  const cartao = {
    id: id(),
    nome: 'Cartão Azul',
    limite: 800000,
    dia_fechamento: 25,
    dia_vencimento: 5,
    arquivado: false,
    created_at: agora,
  }

  const categorias: Categoria[] = CATEGORIAS_PADRAO.map((c) => ({
    ...c,
    id: id(),
    pai_id: null,
    created_at: agora,
  }))
  const cat = (nome: string) => categorias.find((c) => c.nome === nome)!
  const sub = (nome: string, pai: string, icone: string) => {
    const c: Categoria = {
      id: id(),
      nome,
      tipo: 'despesa',
      icone,
      cor: cat(pai).cor,
      pai_id: cat(pai).id,
      created_at: agora,
    }
    categorias.push(c)
    return c
  }
  const mercado = sub('Mercado', 'Alimentação', 'cart')
  const restaurante = sub('Restaurante', 'Alimentação', 'utensils')

  const lancamentos: Lancamento[] = []
  let ordem = 0
  const novo = (l: Partial<Lancamento> & Pick<Lancamento, 'tipo' | 'valor' | 'data'>) => {
    const linha: Lancamento = {
      id: id(),
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
      created_at: new Date(Date.parse(`${l.data}T09:00:00.000Z`) + ordem++ * 1000).toISOString(),
      ...l,
    }
    lancamentos.push(linha)
    return linha
  }
  const gasto = (
    data: string,
    valor: number,
    descricao: string,
    categoria: Categoria,
    forma: FormaPagamento,
  ) => {
    if (data > hoje) return
    const noCartao = forma === 'credito'
    novo({
      tipo: 'despesa',
      valor,
      data,
      descricao,
      categoria_id: categoria.id,
      conta_id: noCartao ? null : forma === 'dinheiro' ? carteira.id : principal.id,
      cartao_id: noCartao ? cartao.id : null,
      forma_pagamento: forma,
    })
  }

  const recorrentes = [
    { tipo: 'receita' as const, descricao: 'Salário', valor: 650000, cat: 'Salário', dia: 5 },
    { tipo: 'despesa' as const, descricao: 'Aluguel', valor: 180000, cat: 'Moradia', dia: 10 },
    { tipo: 'despesa' as const, descricao: 'Internet', valor: 11990, cat: 'Moradia', dia: 15 },
    { tipo: 'despesa' as const, descricao: 'Academia', valor: 9990, cat: 'Saúde', dia: 12 },
    { tipo: 'despesa' as const, descricao: 'Streaming', valor: 3990, cat: 'Assinaturas', dia: 20 },
  ].map((r) => ({ ...r, id: id() }))

  const mesAtual = mesDe(hoje)
  for (let m = -5; m <= 0; m++) {
    const ref = somarMesRef(mesAtual, m)
    const dia = (d: number) => dataNoMes(ref, d)

    for (const r of recorrentes) {
      const data = dia(r.dia)
      if (data > hoje) continue
      const noCartao = r.descricao === 'Streaming'
      novo({
        tipo: r.tipo,
        valor: r.valor,
        data,
        descricao: r.descricao,
        categoria_id: cat(r.cat).id,
        conta_id: noCartao ? null : principal.id,
        cartao_id: noCartao ? cartao.id : null,
        forma_pagamento: noCartao ? 'credito' : r.tipo === 'receita' ? 'transferencia' : 'boleto',
        recorrente_id: r.id,
      })
    }

    if (m % 2 === 0 && dia(18) <= hoje) {
      novo({
        tipo: 'receita',
        valor: entre(60000, 140000),
        data: dia(18),
        descricao: 'Projeto freelance',
        categoria_id: cat('Freelance').id,
        conta_id: principal.id,
        forma_pagamento: 'pix',
      })
    }
    gasto(dia(8), 5990, 'Plano de celular', cat('Assinaturas'), 'debito')
    for (const d of [3, 9, 16, 23, 28])
      gasto(dia(d), entre(16000, 42000), 'Mercado da semana', mercado, d % 2 ? 'debito' : 'credito')
    for (let i = 0; i < 4; i++)
      gasto(
        dia(entre(1, 28)),
        entre(3800, 15500),
        i % 2 ? 'Almoço fora' : 'Jantar',
        restaurante,
        'credito',
      )
    for (let i = 0; i < 7; i++)
      gasto(
        dia(entre(1, 28)),
        entre(900, 4200),
        i % 3 ? 'Aplicativo de transporte' : 'Combustível',
        cat('Transporte'),
        i % 3 ? 'pix' : 'debito',
      )
    for (let i = 0; i < 3; i++)
      gasto(
        dia(entre(1, 28)),
        entre(2500, 16000),
        ['Cinema', 'Show', 'Jogo novo'][i],
        cat('Lazer'),
        i ? 'credito' : 'dinheiro',
      )
    if (rnd() > 0.4) gasto(dia(entre(1, 28)), entre(3500, 21000), 'Farmácia', cat('Saúde'), 'pix')
    if (rnd() > 0.5)
      gasto(dia(entre(1, 28)), entre(4000, 26000), 'Roupas', cat('Compras'), 'credito')
    if (m === -1) gasto(dia(14), 18900, 'Curso online', cat('Estudos'), 'credito')

    if (dia(6) <= hoje) {
      novo({
        tipo: 'transferencia',
        valor: 50000,
        data: dia(6),
        descricao: 'Reserva do mês',
        conta_id: principal.id,
        conta_destino_id: poupanca.id,
        forma_pagamento: 'transferencia',
      })
    }
  }

  // Compra parcelada no cartão: 10 vezes, começada há dois meses.
  const grupo = id()
  const inicioParcelas = dataNoMes(somarMesRef(mesAtual, -2), 12)
  dividirEmParcelas(420000, 10).forEach((valor, i) =>
    novo({
      tipo: 'despesa',
      valor,
      data: somarMeses(inicioParcelas, i),
      descricao: 'Notebook',
      categoria_id: cat('Compras').id,
      cartao_id: cartao.id,
      forma_pagamento: 'credito',
      parcela_atual: i + 1,
      parcela_total: 10,
      grupo_id: grupo,
    }),
  )

  // Faturas já vencidas foram pagas no vencimento.
  for (const f of faturasDoCartao(cartao, lancamentos, hoje)) {
    if (f.total === 0 || f.vencimento >= hoje) continue
    novo({
      tipo: 'pagamento_fatura',
      valor: f.total,
      data: f.vencimento,
      descricao: `Fatura ${cartao.nome}`,
      conta_id: principal.id,
      cartao_id: cartao.id,
      forma_pagamento: 'boleto',
      fatura_ref: f.ref,
    })
  }

  const metas = [
    {
      id: id(),
      nome: 'Reserva de emergência',
      valor_alvo: 2000000,
      prazo: somarMeses(hoje, 10),
      icone: 'shield',
      cor: CORES[0],
      created_at: agora,
    },
    {
      id: id(),
      nome: 'Viagem de férias',
      valor_alvo: 600000,
      prazo: somarMeses(hoje, 5),
      icone: 'plane',
      cor: CORES[2],
      created_at: agora,
    },
    {
      id: id(),
      nome: 'Monitor novo',
      valor_alvo: 180000,
      prazo: null,
      icone: 'laptop',
      cor: CORES[6],
      created_at: agora,
    },
  ]
  const aportes = [
    ...[-5, -4, -3, -2, -1, 0].map((m) => ({
      meta_id: metas[0].id,
      valor: 180000,
      data: somarMeses(somarDias(hoje, -2), m),
    })),
    ...[-3, -2, -1, 0].map((m) => ({
      meta_id: metas[1].id,
      valor: 55000,
      data: somarMeses(somarDias(hoje, -4), m),
    })),
    { meta_id: metas[2].id, valor: 180000, data: somarDias(hoje, -20) },
  ].map((a) => ({ ...a, id: id(), observacao: '', created_at: agora }))

  return {
    contas,
    cartoes: [cartao],
    categorias,
    lancamentos,
    orcamentos: [
      { id: id(), categoria_id: null, valor: 520000, created_at: agora },
      { id: id(), categoria_id: cat('Alimentação').id, valor: 170000, created_at: agora },
      { id: id(), categoria_id: cat('Lazer').id, valor: 30000, created_at: agora },
      { id: id(), categoria_id: cat('Transporte').id, valor: 25000, created_at: agora },
    ],
    metas,
    aportes,
    recorrentes: recorrentes.map((r) => {
      const noMes = dataNoMes(mesAtual, r.dia)
      return {
        id: r.id,
        tipo: r.tipo,
        descricao: r.descricao,
        valor: r.valor,
        categoria_id: cat(r.cat).id,
        conta_id: r.descricao === 'Streaming' ? null : principal.id,
        cartao_id: r.descricao === 'Streaming' ? cartao.id : null,
        frequencia: 'mensal' as const,
        proximo_vencimento: noMes > hoje ? noMes : somarMeses(noMes, 1),
        ativo: true,
        created_at: agora,
      }
    }),
  }
}
