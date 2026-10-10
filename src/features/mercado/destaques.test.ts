import { describe, expect, it } from 'vitest'
import { formatarAlta, MAXIMO_DE_ATIVOS, normalizar } from './destaques'

const opcoes = { fontePadrao: 'api.exemplo.com', hoje: '2026-10-09' }
const base = {
  fonte: 'Provedor',
  inicio: '2026-10-05',
  fim: '2026-10-09',
  atualizado_em: '2026-10-09T21:05:00Z',
  ativos: [
    { codigo: 'aaaa3', nome: 'Empresa A', variacao: 2.5 },
    { codigo: 'BBBB4', variacao: 7.125 },
    { codigo: 'CCCC3', variacao: -3 },
    { codigo: 'DDDD3', variacao: 0 },
  ],
}

describe('normalizar', () => {
  it('fica só com as altas, da maior para a menor', () => {
    expect(normalizar(base, opcoes)).toEqual({
      situacao: 'ok',
      ativos: [
        { codigo: 'BBBB4', nome: null, variacao: 7.125 },
        { codigo: 'AAAA3', nome: 'Empresa A', variacao: 2.5 },
      ],
      inicio: '2026-10-05',
      fim: '2026-10-09',
      fonte: 'Provedor',
      atualizado_em: '2026-10-09T21:05:00Z',
    })
  })

  it('usa a fonte padrão quando a resposta não informa', () => {
    const d = normalizar({ ...base, fonte: undefined }, opcoes)
    expect(d.situacao === 'ok' && d.fonte).toBe('api.exemplo.com')
  })

  it('ignora itens inválidos e códigos repetidos', () => {
    const d = normalizar(
      {
        ...base,
        ativos: [
          { codigo: 'AAAA3', variacao: 1 },
          { codigo: 'aaaa3', variacao: 4 },
          { codigo: '', variacao: 9 },
          { codigo: 'EEEE3', variacao: '5' },
          { codigo: 'FFFF3', variacao: Infinity },
          null,
        ],
      },
      opcoes,
    )
    expect(d.situacao === 'ok' && d.ativos).toEqual([{ codigo: 'AAAA3', nome: null, variacao: 4 }])
  })

  it('limita a quantidade de ativos', () => {
    const ativos = Array.from({ length: 40 }, (_, i) => ({ codigo: `X${i}`, variacao: i + 1 }))
    const d = normalizar({ ...base, ativos }, opcoes)
    expect(d.situacao === 'ok' && d.ativos.length).toBe(MAXIMO_DE_ATIVOS)
    expect(d.situacao === 'ok' && d.ativos[0].codigo).toBe('X39')
  })

  it('avisa quando nenhum ativo subiu', () => {
    const d = normalizar({ ...base, ativos: [{ codigo: 'CCCC3', variacao: -3 }] }, opcoes)
    expect(d).toEqual({ situacao: 'indisponivel', motivo: 'sem-altas' })
  })

  it('recusa resposta incompleta, período maior que uma semana ou dados antigos', () => {
    const falha = { situacao: 'indisponivel', motivo: 'falha' }
    expect(normalizar(null, opcoes)).toEqual(falha)
    expect(normalizar({ ...base, atualizado_em: 'ontem' }, opcoes)).toEqual(falha)
    expect(normalizar({ ...base, inicio: '2026-02-30' }, opcoes)).toEqual(falha)
    expect(normalizar({ ...base, inicio: '2026-09-01' }, opcoes)).toEqual(falha)
    expect(normalizar({ ...base, inicio: '2026-10-09' }, opcoes)).toEqual(falha)
    expect(normalizar(base, { ...opcoes, hoje: '2026-10-17' })).toEqual(falha)
  })
})

describe('formatarAlta', () => {
  it('usa vírgula, duas casas e o sinal de mais', () => {
    expect(formatarAlta(4.3)).toBe('+4,30%')
    expect(formatarAlta(12)).toBe('+12,00%')
  })
})
