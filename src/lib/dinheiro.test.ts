import { describe, expect, it } from 'vitest'
import { digitosParaCentavos, formatarCentavos, formatarReais, interpretarMoeda } from './dinheiro'

describe('interpretarMoeda', () => {
  it('entende formatos comuns', () => {
    expect(interpretarMoeda('1.234,56')).toBe(123456)
    expect(interpretarMoeda('1234,5')).toBe(123450)
    expect(interpretarMoeda('1,234.56')).toBe(123456)
    expect(interpretarMoeda('1.234')).toBe(123400)
    expect(interpretarMoeda('12.5')).toBe(1250)
    expect(interpretarMoeda('R$ 45')).toBe(4500)
  })
  it('recusa o que não é valor', () => {
    expect(interpretarMoeda('abc')).toBeNull()
    expect(interpretarMoeda('-5')).toBeNull()
    expect(interpretarMoeda('')).toBeNull()
  })
})

describe('formatação', () => {
  it('formata centavos', () => {
    expect(formatarCentavos(0)).toBe('0,00')
    expect(formatarCentavos(123456)).toBe('1.234,56')
  })
  it('formata reais com sinal de menos', () => {
    expect(formatarReais(-4500)).toBe('− R$ 45,00')
    expect(formatarReais(7550)).toBe('R$ 75,50')
  })
  it('máscara de dígitos', () => {
    expect(digitosParaCentavos('0,05')).toBe(5)
    expect(digitosParaCentavos('')).toBe(0)
    expect(digitosParaCentavos('123456789012')).toBe(1234567890)
  })
})
