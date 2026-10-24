import { describe, expect, it } from 'vitest'
import { ESQUEMAS } from '@/features/financas/esquemas'
import { categoriaPara, dadosDoCartao, lancamentoPara, type CategoriaSimples } from './mapear'

const C = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const categorias: CategoriaSimples[] = [
  { id: C(1), nome: 'Alimentação', tipo: 'despesa' },
  { id: C(2), nome: 'Transporte', tipo: 'despesa' },
  { id: C(3), nome: 'Salário', tipo: 'receita' },
]
const CONTA = C(10)
const CARTAO = C(20)
const valido = (l: object) =>
  ESQUEMAS.lancamentos.safeParse({ ...l, id: C(99), created_at: '2026-10-01T00:00:00Z' }).success

describe('categoriaPara', () => {
  it('acha a categoria do app pelo nome que o banco deu', () => {
    expect(categoriaPara('Groceries', 'despesa', categorias)).toBe(C(1))
    expect(categoriaPara('Transporte por aplicativo', 'despesa', categorias)).toBe(C(2))
    expect(categoriaPara('Salary', 'receita', categorias)).toBe(C(3))
    expect(categoriaPara('Taxes', 'despesa', categorias)).toBeNull()
    expect(categoriaPara(null, 'despesa', categorias)).toBeNull()
  })
})

describe('lancamentoPara', () => {
  const t = {
    id: 'x',
    date: '2026-10-20T15:00:00.000Z',
    description: 'IFOOD   *RESTAURANTE',
    type: 'DEBIT',
    amount: -54.9,
    amountInAccountCurrency: null,
    category: 'Eating out',
  }

  it('saída da conta vira despesa com categoria', () => {
    const l = lancamentoPara(t, { tipo: 'conta', id: CONTA }, categorias, null)
    expect(l).toMatchObject({
      tipo: 'despesa',
      valor: 5490,
      data: '2026-10-20',
      conta_id: CONTA,
      categoria_id: C(1),
      descricao: 'IFOOD *RESTAURANTE',
    })
    expect(valido(l!)).toBe(true)
  })

  it('entrada na conta vira receita', () => {
    const l = lancamentoPara(
      { ...t, type: 'CREDIT', amount: 6500, category: 'Salary', description: 'SALARIO' },
      { tipo: 'conta', id: CONTA },
      categorias,
      null,
    )
    expect(l).toMatchObject({ tipo: 'receita', valor: 650000, categoria_id: C(3) })
    expect(valido(l!)).toBe(true)
  })

  it('compra parcelada no cartão guarda a parcela', () => {
    const l = lancamentoPara(
      { ...t, amount: 100, creditCardMetadata: { installmentNumber: 2, totalInstallments: 5 } },
      { tipo: 'cartao', id: CARTAO },
      categorias,
      null,
    )
    expect(l).toMatchObject({
      tipo: 'despesa',
      cartao_id: CARTAO,
      conta_id: null,
      parcela_atual: 2,
      parcela_total: 5,
      forma_pagamento: 'credito',
    })
    expect(valido(l!)).toBe(true)
  })

  it('pagamento da fatura na conta vira pagamento de fatura, não gasto', () => {
    const l = lancamentoPara(
      { ...t, category: 'Credit card payment', description: 'PAGTO FATURA' },
      { tipo: 'conta', id: CONTA },
      categorias,
      CARTAO,
    )
    expect(l).toMatchObject({ tipo: 'pagamento_fatura', cartao_id: CARTAO, fatura_ref: '2026-10' })
    expect(valido(l!)).toBe(true)
  })

  it('ignora pendentes, valor zero e créditos no cartão', () => {
    expect(
      lancamentoPara({ ...t, status: 'PENDING' }, { tipo: 'conta', id: CONTA }, categorias, null),
    ).toBeNull()
    expect(
      lancamentoPara({ ...t, amount: 0 }, { tipo: 'conta', id: CONTA }, categorias, null),
    ).toBeNull()
    expect(
      lancamentoPara({ ...t, type: 'CREDIT' }, { tipo: 'cartao', id: CARTAO }, categorias, null),
    ).toBeNull()
  })
})

describe('dadosDoCartao', () => {
  it('converte limite e dias da fatura (até 28)', () => {
    expect(
      dadosDoCartao({
        id: 'c',
        type: 'CREDIT',
        subtype: 'CREDIT_CARD',
        name: 'Visa',
        marketingName: null,
        number: '1234',
        balance: 0,
        creditData: {
          creditLimit: 5000,
          balanceCloseDate: '2026-10-30',
          balanceDueDate: '2026-11-07',
        },
      }),
    ).toEqual({ limite: 500000, dia_fechamento: 28, dia_vencimento: 7 })
  })
})
