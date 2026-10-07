import type { Tema } from './tipos'

// Classificação simples por palavras-chave no título e nas categorias do feed.
// A ordem importa: o primeiro tema que bater vence.
const REGRAS: [Tema, RegExp][] = [
  ['cripto', /\b(bitcoin|btc|cripto\w*|ethereum|blockchain|stablecoin|altcoin|token\w*)\b/],
  [
    'financas-pessoais',
    /\b(financas pessoais|imposto de renda|irpf|fgts|inss|aposentadoria|previdencia|cartao de credito|endividad\w*|inadimpl\w*|dividas?|poupanca|consorcio|financiamento|aluguel|salario minimo|13o|decimo terceiro|pix|emprestimo\w*|consignado|orcamento familiar|planejamento financeiro|restituicao|bolsa familia|educacao financeira|golpes?)\b/,
  ],
  [
    'investimentos',
    /\b(investiment\w*|investidor\w*|acoes|acao|ibovespa|ifix|b3|bolsa|fiis?|fundos? imobiliarios?|dividendos?|proventos|tesouro direto|renda fixa|renda variavel|cdb|lci|lca|debentures?|etfs?|bdrs?|small caps?|ipo|carteira recomendada|wall street|nasdaq|s&p|dow jones|[a-z]{4}(3|4|11))\b/,
  ],
  [
    'economia',
    /\b(economia|inflacao|ipca|igp-?m|selic|juros|copom|pib|dolar|cambio|banco central|bc|fed|fiscal|arcabouco|deficit|superavit|desemprego|emprego|balanca comercial|exportac\w*|importac\w*|tarifas?|reforma tributaria|impostos?|tesouro nacional|fazenda|recessao|petroleo)\b/,
  ],
  [
    'negocios',
    /\b(negocios|empresas?|lucro|prejuizo|balanco|resultado trimestral|fusao|aquisicao|startup\w*|varejo|bancos?|ceo|mercado|agronegocio|industria)\b/,
  ],
]

export function semAcento(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function classificar(titulo: string, categorias: string[]): Tema {
  const alvo = semAcento(`${titulo} | ${categorias.join(' | ')}`)
  for (const [tema, regra] of REGRAS) if (regra.test(alvo)) return tema
  return 'geral'
}
