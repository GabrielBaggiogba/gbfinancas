import { describe, expect, it } from 'vitest'
import {
  dataValida,
  hojeEmSaoPaulo,
  inicioDaJanela,
  listarDias,
  rotuloCurto,
  rotuloLongo,
  somarDias,
} from './datas'

describe('datas', () => {
  it('hoje em São Paulo às 22h30', () => {
    expect(hojeEmSaoPaulo(new Date('2026-10-07T01:30:00Z'))).toBe('2026-10-06')
  })
  it('soma dias atravessando mês', () => {
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('início da janela de 30 dias', () => {
    expect(inicioDaJanela('2026-10-06')).toBe('2026-09-07')
  })
  it('lista dias em ordem decrescente', () => {
    expect(listarDias('2026-10-04', '2026-10-06')).toEqual([
      '2026-10-06',
      '2026-10-05',
      '2026-10-04',
    ])
  })
  it('rótulos', () => {
    expect(rotuloCurto('2026-10-06', '2026-10-06')).toBe('Hoje')
    expect(rotuloCurto('2026-10-05', '2026-10-06')).toBe('Ontem')
    expect(rotuloCurto('2026-10-02', '2026-10-06')).toBe('sex, 2 out')
    expect(rotuloLongo('2026-10-05')).toBe('segunda, 5 de outubro')
  })
  it('valida datas', () => {
    expect(dataValida('2026-02-30')).toBe(false)
    expect(dataValida('2026-02-28')).toBe(true)
  })
})
