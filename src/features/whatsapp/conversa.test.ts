import { describe, expect, it } from 'vitest'
import { DADOS_VAZIOS, type Dados } from '@/features/financas/tipos'
import { lancamentoVazio } from '@/features/financas/fabrica'
import { ehPergunta, resumoDoDia } from './conversa'

describe('ehPergunta', () => {
  it('reconhece perguntas sobre o dinheiro', () => {
    expect(ehPergunta('Quanto gastei este mês?')).toBe(true)
    expect(ehPergunta('qual meu saldo')).toBe(true)
    expect(ehPergunta('resumo')).toBe(true)
    expect(ehPergunta('Posso comprar um tênis de 300?')).toBe(true)
  })
  it('lançamentos não são perguntas', () => {
    expect(ehPergunta('gastei 45 no mercado ontem')).toBe(false)
    expect(ehPergunta('almoço 32 no pix')).toBe(false)
    expect(ehPergunta('recebi 1500 de salário')).toBe(false)
  })
})

describe('resumoDoDia', () => {
  it('soma gastos e entradas do mês e do dia', () => {
    const dados: Dados = {
      ...DADOS_VAZIOS,
      lancamentos: [
        lancamentoVazio({ tipo: 'despesa', data: '2026-11-01', valor: 4500, descricao: 'Mercado' }),
        lancamentoVazio({ tipo: 'receita', data: '2026-11-01', valor: 150000, descricao: 'Salário' }),
        lancamentoVazio({ tipo: 'despesa', data: '2026-10-31', valor: 2000, descricao: 'Uber' }),
      ],
    }
    const texto = resumoDoDia(dados, '2026-11-01')
    expect(texto).toContain('Gastos: R$ 45,00')
    expect(texto).toContain('Entradas: R$ 1.500,00')
    expect(texto).toMatch(/Hoje você gastou R\$ 45,00; ontem, R\$ 20,00/)
  })
})
