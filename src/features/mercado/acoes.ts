import { z } from 'zod'

// Ações da B3 vindas da lista pública da brapi.dev (/api/quote/list). Nenhum número
// nasce aqui: o módulo só confere, limpa e ordena o que a fonte mandou.

export type Acao = {
  codigo: string
  nome: string
  /** Último preço, em reais. */
  preco: number
  /** Variação do dia (último pregão), em % (4.3 = +4,3%). */
  variacao: number
  /** Quantidade de ações negociadas no dia. */
  volume: number
  /** Volume financeiro aproximado do dia: volume × preço, em reais. */
  giro: number
  /** Valor de mercado, em reais. */
  valor_mercado: number | null
  setor: string | null
}

export type Mercado =
  | { situacao: 'ok'; acoes: Acao[]; consultado_em: string; fonte: string }
  | { situacao: 'indisponivel' }

export const FONTE_DADOS = 'brapi.dev'

/** Altas e baixas só entre ações com pelo menos este giro no dia, para fugir de saltos sem negócio. */
export const GIRO_MINIMO = 1_000_000
/** Small caps: valor de mercado até R$ 10 bilhões. */
export const TETO_SMALL_CAP = 10_000_000_000

const numero = z.number().finite()
const item = z.object({
  stock: z.string().trim().min(3).max(12),
  name: z.string().trim().max(120).nullish(),
  close: numero.positive(),
  change: numero,
  volume: numero.nonnegative().nullish(),
  market_cap: numero.positive().nullish(),
  sector: z.string().trim().max(60).nullish(),
})

const resposta = z.object({ stocks: z.array(z.unknown()).max(5000) })

/** Lê a resposta da brapi. Itens inválidos são ignorados; resposta fora do formato lança. */
export function lerListaBrapi(bruto: unknown): Acao[] {
  const r = resposta.safeParse(bruto)
  if (!r.success) throw new Error('Resposta da lista fora do formato')
  const vistos = new Set<string>()
  const acoes: Acao[] = []
  for (const bruta of r.data.stocks) {
    const a = item.safeParse(bruta)
    if (!a.success) continue
    const codigo = a.data.stock.toUpperCase()
    // Mercado fracionário (PETR4F) repete a ação com pouquíssimo negócio.
    if (codigo.endsWith('F') || !/^[A-Z0-9]{4}\d{1,2}$/.test(codigo)) continue
    const volume = a.data.volume ?? 0
    if (volume <= 0 || vistos.has(codigo)) continue
    vistos.add(codigo)
    acoes.push({
      codigo,
      nome: nomeLegivel(a.data.name ?? codigo),
      preco: a.data.close,
      variacao: Math.round(a.data.change * 100) / 100,
      volume,
      giro: Math.round(volume * a.data.close),
      valor_mercado: a.data.market_cap ?? null,
      setor: a.data.sector || null,
    })
  }
  return acoes
}

const LIGACOES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para'])
const VOGAL = /[AEIOUÁÉÍÓÚÂÊÔÃÕ]/i

/** "MAGAZINE LUIZA S.A." vira "Magazine Luiza"; siglas sem vogal (BRF, JBS) ficam em maiúsculas. */
export function nomeLegivel(nome: string): string {
  const limpo = nome
    .replace(/\s+-\s+.*$/, '')
    .replace(/[,\s]+(S\.?\s?\/?\s?A\.?|SA)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return limpo
    .split(' ')
    .map((p, i) => {
      const baixa = p.toLocaleLowerCase('pt-BR')
      if (i > 0 && LIGACOES.has(baixa)) return baixa
      if (!VOGAL.test(p) || /\d/.test(p)) return p.toUpperCase()
      return baixa.charAt(0).toLocaleUpperCase('pt-BR') + baixa.slice(1)
    })
    .join(' ')
}

const porVariacao = (a: Acao, b: Acao) => b.variacao - a.variacao || b.giro - a.giro

/** Maiores altas e baixas do dia entre as ações com giro suficiente. */
export function altasEBaixas(acoes: Acao[], quantidade = 5): { altas: Acao[]; baixas: Acao[] } {
  const liquidas = acoes.filter((a) => a.giro >= GIRO_MINIMO)
  const altas = liquidas.filter((a) => a.variacao > 0).sort(porVariacao)
  const baixas = liquidas.filter((a) => a.variacao < 0).sort((a, b) => porVariacao(b, a))
  return { altas: altas.slice(0, quantidade), baixas: baixas.slice(0, quantidade) }
}

export type Ranking = 'valor' | 'negociadas' | 'small'

export const ROTULO_RANKING: Record<Ranking, { titulo: string; curto: string; criterio: string }> =
  {
    valor: {
      titulo: 'Valor de mercado',
      curto: 'Valor',
      criterio: 'Maiores empresas por valor de mercado.',
    },
    negociadas: {
      titulo: 'Mais negociadas',
      curto: 'Negociadas',
      criterio: 'Maior volume financeiro no dia (ações negociadas × preço).',
    },
    small: {
      titulo: 'Small caps',
      curto: 'Small caps',
      criterio: 'Valor de mercado até R$ 10 bilhões, das maiores para as menores.',
    },
  }

export function ranking(acoes: Acao[], tipo: Ranking, quantidade = 10): Acao[] {
  const comValor = acoes.filter((a) => a.valor_mercado !== null)
  const lista =
    tipo === 'negociadas'
      ? [...acoes].sort((a, b) => b.giro - a.giro)
      : tipo === 'valor'
        ? comValor.sort((a, b) => (b.valor_mercado ?? 0) - (a.valor_mercado ?? 0))
        : comValor
            .filter((a) => (a.valor_mercado ?? 0) <= TETO_SMALL_CAP)
            .sort((a, b) => (b.valor_mercado ?? 0) - (a.valor_mercado ?? 0))
  return lista.slice(0, quantidade)
}

// ---------- Formatação ----------

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarPreco(v: number): string {
  return reais.format(v)
}

/** 4.3 -> "+4,30%", -1.5 -> "−1,50%" */
export function formatarVariacao(p: number): string {
  const texto = Math.abs(p).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${texto}%`
}

/** 763_070_000_000 -> "R$ 763,07 bi"; 25_000_000 -> "R$ 25,00 mi" */
export function formatarGrande(v: number): string {
  const casas = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  if (v >= 1e12) return `R$ ${(v / 1e12).toLocaleString('pt-BR', casas)} tri`
  if (v >= 1e9) return `R$ ${(v / 1e9).toLocaleString('pt-BR', casas)} bi`
  if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', casas)} mi`
  if (v >= 1e3) return `R$ ${(v / 1e3).toLocaleString('pt-BR', casas)} mil`
  return reais.format(v)
}

/** Página do ativo no TradingView, para quem quiser ver o gráfico. */
export function linkDoAtivo(codigo: string): string {
  return `https://br.tradingview.com/symbols/BMFBOVESPA-${encodeURIComponent(codigo)}/`
}

export function logoDoAtivo(codigo: string): string {
  return `https://icons.brapi.dev/icons/${encodeURIComponent(codigo)}.svg`
}
