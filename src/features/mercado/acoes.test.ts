import { describe, expect, it } from 'vitest'
import {
  altasEBaixas,
  formatarGrande,
  formatarVariacao,
  lerListaBrapi,
  nomeLegivel,
  ranking,
  type Acao,
} from './acoes'

// Valores fictícios, só para testar as regras.
const bruto = (stock: string, close: number, change: number, volume: number, cap?: number) => ({
  stock,
  name: `${stock} S.A.`,
  close,
  change,
  volume,
  market_cap: cap ?? null,
  sector: 'Finance',
})

describe('lerListaBrapi', () => {
  it('limpa a lista: fora fracionário, sem negócio, inválidos e repetidos', () => {
    const acoes = lerListaBrapi({
      stocks: [
        bruto('AAAA3', 10, 5, 200_000, 5e9),
        bruto('AAAA3F', 10, 50, 20),
        bruto('BBBB4', 20, -3, 0),
        bruto('CCCC11', 0, 2, 100),
        { stock: 'DDDD3' },
        bruto('aaaa3', 11, 1, 1),
        bruto('^BVSP', 100, 1, 1),
      ],
    })
    expect(acoes.map((a) => a.codigo)).toEqual(['AAAA3'])
    expect(acoes[0]).toMatchObject({ preco: 10, variacao: 5, giro: 2_000_000, valor_mercado: 5e9 })
  })

  it('recusa resposta sem a lista', () => {
    expect(() => lerListaBrapi({ erro: true })).toThrow()
  })
})

const acao = (
  codigo: string,
  variacao: number,
  giro: number,
  valor: number | null = null,
): Acao => ({
  codigo,
  nome: codigo,
  preco: 10,
  variacao,
  volume: giro / 10,
  giro,
  valor_mercado: valor,
  setor: null,
})

describe('altasEBaixas', () => {
  it('ordena e ignora quem negociou pouco', () => {
    const r = altasEBaixas(
      [
        acao('A', 9, 5e6),
        acao('B', 40, 10_000),
        acao('C', 3, 2e6),
        acao('D', -7, 3e6),
        acao('E', -2, 3e6),
        acao('F', 0, 3e6),
      ],
      5,
    )
    expect(r.altas.map((a) => a.codigo)).toEqual(['A', 'C'])
    expect(r.baixas.map((a) => a.codigo)).toEqual(['D', 'E'])
  })
})

describe('ranking', () => {
  const lista = [
    acao('GRANDE', 1, 1e6, 500e9),
    acao('MEDIA', 1, 9e9, 9e9),
    acao('PEQ', 1, 5e6, 1e9),
    acao('SEMVALOR', 1, 2e9, null),
  ]
  it('valor de mercado, mais negociadas e small caps', () => {
    expect(ranking(lista, 'valor').map((a) => a.codigo)).toEqual(['GRANDE', 'MEDIA', 'PEQ'])
    expect(ranking(lista, 'negociadas').map((a) => a.codigo)).toEqual([
      'MEDIA',
      'SEMVALOR',
      'PEQ',
      'GRANDE',
    ])
    expect(ranking(lista, 'small').map((a) => a.codigo)).toEqual(['MEDIA', 'PEQ'])
  })
})

describe('formatação', () => {
  it('nomes legíveis', () => {
    expect(nomeLegivel('MAGAZINE LUIZA S.A.')).toBe('Magazine Luiza')
    expect(nomeLegivel('BCO BRADESCO S.A.')).toBe('Bco Bradesco')
    expect(nomeLegivel('CIA CELG DE PARTICIPACOES - CELGPAR')).toBe('Cia Celg de Participacoes')
    expect(nomeLegivel('BRF SA')).toBe('BRF')
  })
  it('variação e valores grandes', () => {
    expect(formatarVariacao(42.84)).toBe('+42,84%')
    expect(formatarVariacao(-8.93)).toBe('−8,93%')
    expect(formatarVariacao(0)).toBe('0,00%')
    expect(formatarGrande(763_070_000_000)).toBe('R$ 763,07 bi')
    expect(formatarGrande(25_000_000)).toBe('R$ 25,00 mi')
  })
})
