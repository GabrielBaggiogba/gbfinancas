import { describe, expect, it } from 'vitest'
import { calcularDestaques, formatarVariacao } from './destaques'

// Valores fictícios, só para testar as regras.
const base = {
  fonte: 'API de teste',
  periodo: { inicio: '2026-10-02', fim: '2026-10-09' },
  atualizado_em: '2026-10-09T18:30:00-03:00',
}

describe('calcularDestaques', () => {
  it('calcula pela variação dos fechamentos, só altas, da maior para a menor', () => {
    const r = calcularDestaques({
      ...base,
      ativos: [
        { codigo: 'aaa3', fechamento_inicial: 10, fechamento_final: 11 },
        { codigo: 'BBB4', nome: 'Bê', fechamento_inicial: 20, fechamento_final: 25 },
        { codigo: 'CCC3', fechamento_inicial: 10, fechamento_final: 9 },
        { codigo: 'DDD3', variacao_pct: 3.456 },
        { codigo: 'EEE3', variacao_pct: 0 },
      ],
    })
    expect(r.situacao).toBe('ok')
    if (r.situacao !== 'ok') return
    expect(r.itens).toEqual([
      { codigo: 'BBB4', nome: 'Bê', variacao_pct: 25 },
      { codigo: 'AAA3', nome: null, variacao_pct: 10 },
      { codigo: 'DDD3', nome: null, variacao_pct: 3.46 },
    ])
    expect(r.atualizado_em).toBe('2026-10-09T21:30:00.000Z')
  })

  it('prefere os fechamentos à variação pronta e ignora código repetido', () => {
    const r = calcularDestaques({
      ...base,
      ativos: [
        { codigo: 'AAA3', fechamento_inicial: 10, fechamento_final: 12, variacao_pct: 99 },
        { codigo: 'aaa3', variacao_pct: 50 },
      ],
    })
    expect(r.situacao === 'ok' && r.itens).toEqual([
      { codigo: 'AAA3', nome: null, variacao_pct: 20 },
    ])
  })

  it('respeita o limite e permite trocar o nome da fonte', () => {
    const ativos = Array.from({ length: 15 }, (_, i) => ({ codigo: `X${i}`, variacao_pct: i + 1 }))
    const r = calcularDestaques({ ...base, ativos }, { limite: 5, fonte: 'Minha fonte' })
    expect(r.situacao === 'ok' && r.itens.map((d) => d.codigo)).toEqual([
      'X14',
      'X13',
      'X12',
      'X11',
      'X10',
    ])
    expect(r.situacao === 'ok' && r.fonte).toBe('Minha fonte')
  })

  it('sem nenhuma alta, diz isso em vez de mostrar quedas', () => {
    const r = calcularDestaques({ ...base, ativos: [{ codigo: 'A', variacao_pct: -2 }] })
    expect(r.situacao).toBe('sem-alta')
  })

  it('recusa período que não é semanal e resposta fora do formato', () => {
    expect(() =>
      calcularDestaques({
        ...base,
        periodo: { inicio: '2026-09-01', fim: '2026-10-09' },
        ativos: [],
      }),
    ).toThrow(/Período/)
    expect(() =>
      calcularDestaques({
        ...base,
        periodo: { inicio: '2026-10-09', fim: '2026-10-09' },
        ativos: [],
      }),
    ).toThrow(/Período/)
    expect(() => calcularDestaques({ ...base, ativos: [{ codigo: 'A' }] })).toThrow(/formato/)
    expect(() => calcularDestaques({ ativos: [] })).toThrow(/formato/)
    expect(() =>
      calcularDestaques({
        ...base,
        ativos: [{ codigo: 'A', fechamento_inicial: 0, fechamento_final: 1 }],
      }),
    ).toThrow(/formato/)
  })
})

describe('formatarVariacao', () => {
  it('usa vírgula, duas casas e sinal', () => {
    expect(formatarVariacao(6.3)).toBe('+6,30%')
    expect(formatarVariacao(12.345)).toBe('+12,35%')
    expect(formatarVariacao(-1.5)).toBe('−1,50%')
  })
})
