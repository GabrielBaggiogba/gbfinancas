import { describe, expect, it } from 'vitest'
import { limitesDe } from './planos'

describe('limitesDe', () => {
  it('com a cobrança desligada, todo mundo tem tudo', () => {
    expect(limitesDe(null, false).contas).toBe(Infinity)
    expect(limitesDe('essencial', false).whatsapp).toBe(true)
  })
  it('com a cobrança ligada, cada plano libera o seu', () => {
    expect(limitesDe('essencial', true)).toMatchObject({
      contas: 3,
      cartoes: 2,
      whatsapp: false,
      openFinance: false,
    })
    expect(limitesDe(null, true).contas).toBe(3)
    expect(limitesDe('completo', true)).toMatchObject({
      whatsapp: true,
      openFinance: true,
      familia: false,
    })
    expect(limitesDe('familia', true).familia).toBe(true)
    expect(limitesDe('fundador', true).familia).toBe(true)
  })
})
