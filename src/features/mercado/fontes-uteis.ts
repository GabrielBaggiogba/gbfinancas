// Sites para acompanhar o mercado. São só links: nada destas páginas é lido pelo app.

export type FonteUtil = {
  nome: string
  secao?: string
  descricao: string
  url: string
}

export const FONTES_UTEIS: FonteUtil[] = [
  {
    nome: 'InfoMoney',
    secao: 'Mercados',
    descricao: 'Cobertura diária da bolsa, câmbio e juros, com análises de empresas.',
    url: 'https://www.infomoney.com.br/mercados/',
  },
  {
    nome: 'Valor Econômico',
    secao: 'Finanças',
    descricao: 'Bancos, crédito, mercado de capitais e política monetária.',
    url: 'https://valor.globo.com/financas/',
  },
  {
    nome: 'B3',
    descricao: 'Site oficial da bolsa brasileira: índices, produtos e comunicados.',
    url: 'https://www.b3.com.br/',
  },
  {
    nome: 'Investing.com',
    secao: 'Brasil',
    descricao: 'Cotações, calendário econômico e notícias de mercados do mundo todo.',
    url: 'https://br.investing.com/',
  },
  {
    nome: 'TradingView',
    secao: 'Ações do Brasil',
    descricao: 'Lista de ações da B3 com variação, volume e gráficos interativos.',
    url: 'https://br.tradingview.com/markets/stocks-brazil/',
  },
  {
    nome: 'Investing.com',
    secao: 'Gráficos',
    descricao: 'Gráficos em tempo real com indicadores técnicos.',
    url: 'https://br.investing.com/charts',
  },
  {
    nome: 'B3',
    secao: 'Histórico de mercado',
    descricao: 'Séries históricas oficiais de cotações para download.',
    url: 'https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/',
  },
  {
    nome: 'Forbes Brasil',
    secao: 'Money',
    descricao: 'Negócios, investimentos e finanças pessoais.',
    url: 'https://forbes.com.br/',
  },
]

/** "www.b3.com.br/pt_br/..." vira "b3.com.br". */
export function dominio(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '')
}
