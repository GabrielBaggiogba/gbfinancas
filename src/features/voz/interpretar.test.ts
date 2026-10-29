import { describe, expect, it } from 'vitest'
import { interpretarFala, type Opcoes } from './interpretar'

const o: Opcoes = {
  hoje: '2026-10-28', // quarta-feira
  categorias: [
    { id: 'ali', nome: 'Alimentação', tipo: 'despesa' },
    { id: 'tra', nome: 'Transporte', tipo: 'despesa' },
    { id: 'com', nome: 'Compras', tipo: 'despesa' },
    { id: 'sal', nome: 'Salário', tipo: 'receita' },
  ],
  contas: [{ id: 'itau', nome: 'Itaú' }],
  cartoes: [{ id: 'nu', nome: 'Nubank' }],
}

describe('interpretarFala', () => {
  it('gasto simples com data e forma de pagamento', () => {
    const r = interpretarFala('Gastei 45 reais no mercado ontem no pix', o)!
    expect(r).toMatchObject({
      tipo: 'despesa',
      valor: 45,
      descricao: 'Mercado',
      data: '2026-10-27',
      categoria_id: 'ali',
      forma_pagamento: 'pix',
      parcelas: 1,
    })
  })

  it('centavos com vírgula e com "e ... centavos"', () => {
    expect(interpretarFala('uber 23,90', o)).toMatchObject({ valor: 23.9, categoria_id: 'tra' })
    expect(interpretarFala('paguei 12 reais e 50 centavos no café', o)!.valor).toBe(12.5)
    expect(interpretarFala('R$ 1.250,00 aluguel', o)!.valor).toBe(1250)
  })

  it('valor por extenso e milhar falado', () => {
    expect(interpretarFala('cinquenta reais de lanche', o)!.valor).toBe(50)
    expect(interpretarFala('recebi 2 mil de salário', o)).toMatchObject({
      tipo: 'receita',
      valor: 2000,
      categoria_id: 'sal',
    })
  })

  it('compra parcelada no cartão', () => {
    expect(interpretarFala('comprei um tênis de 300 em 3 vezes no Nubank', o)).toMatchObject({
      valor: 300,
      parcelas: 3,
      cartao_id: 'nu',
      forma_pagamento: 'credito',
      descricao: 'Tênis',
      categoria_id: 'com',
    })
  })

  it('dia da semana e dia do mês', () => {
    expect(interpretarFala('farmácia 30 na segunda', o)!.data).toBe('2026-10-26')
    expect(interpretarFala('farmácia 30 dia 5', o)!.data).toBe('2026-10-05')
    expect(interpretarFala('farmácia 30 dia 30', o)!.data).toBe('2026-09-30')
  })

  it('sem valor não registra', () => {
    expect(interpretarFala('fui ao mercado', o)).toBeNull()
  })
})
