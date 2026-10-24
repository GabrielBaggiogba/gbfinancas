import { describe, expect, it } from 'vitest'
import { linhaDoAviso } from './lembretes'

describe('linhaDoAviso', () => {
  it('diz quando vence ou entra', () => {
    const hoje = '2026-10-24'
    expect(
      linhaDoAviso({ descricao: 'Aluguel', valor: 1800, tipo: 'despesa', proximo_vencimento: '2026-10-25' }, hoje),
    ).toBe('Aluguel · R$ 1.800,00 · vence amanhã (25/10/2026)')
    expect(
      linhaDoAviso({ descricao: 'Salário', valor: 6500.5, tipo: 'receita', proximo_vencimento: hoje }, hoje),
    ).toBe('Salário · R$ 6.500,50 · entra hoje (24/10/2026)')
  })
})
