import { describe, expect, it } from 'vitest'
import { calcular, formatarResultado } from './calculadora'

describe('calcular', () => {
  it('respeita precedência, parênteses e sinal', () => {
    expect(calcular('2 + 3 × 4')).toBe(14)
    expect(calcular('(2 + 3) * 4')).toBe(20)
    expect(calcular('-5 + 2')).toBe(-3)
    expect(calcular('10 ÷ 4')).toBe(2.5)
  })
  it('lê vírgula, ponto decimal e ponto de milhar', () => {
    expect(calcular('0,1 + 0,2')).toBe(0.3)
    expect(calcular('1.500,50 + 1.000')).toBe(2500.5)
    expect(calcular('1.5 * 2')).toBe(3)
  })
  it('trata porcentagem como calculadora de bolso', () => {
    expect(calcular('200 + 10%')).toBe(220)
    expect(calcular('200 - 10%')).toBe(180)
    expect(calcular('200 × 10%')).toBe(20)
    expect(calcular('50%')).toBe(0.5)
  })
  it('devolve null para expressão incompleta, inválida ou divisão por zero', () => {
    for (const e of ['', '2 +', '(2', '2 2', 'abc', '1 / 0', '2 ** 3']) expect(calcular(e)).toBeNull()
  })
  it('formata com vírgula', () => {
    expect(formatarResultado(2500.5)).toBe('2500,5')
  })
})
