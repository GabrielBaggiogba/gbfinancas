// Sites externos da seção "Acompanhe o mercado". São só links: nada é lido dessas páginas.
// Para acrescentar um site, basta uma linha aqui.

export type LinkDeMercado = {
  nome: string
  tipo: string
  descricao: string
  url: string
}

export const LINKS_DE_MERCADO: LinkDeMercado[] = [
  {
    nome: 'InfoMoney — Mercados',
    tipo: 'Notícias',
    descricao: 'Cobertura diária da bolsa, do câmbio e dos juros.',
    url: 'https://www.infomoney.com.br/mercados/',
  },
  {
    nome: 'Valor Econômico — Finanças',
    tipo: 'Notícias',
    descricao: 'Notícias e análises sobre bancos, investimentos e mercado financeiro.',
    url: 'https://valor.globo.com/financas/',
  },
  {
    nome: 'B3',
    tipo: 'Bolsa',
    descricao: 'Site oficial da bolsa brasileira: produtos, índices e comunicados.',
    url: 'https://www.b3.com.br/',
  },
  {
    nome: 'Investing.com Brasil',
    tipo: 'Cotações',
    descricao: 'Cotações de ações, moedas, índices e commodities, com calendário econômico.',
    url: 'https://br.investing.com/',
  },
  {
    nome: 'TradingView — Ações do Brasil',
    tipo: 'Cotações',
    descricao: 'Painel das ações brasileiras com filtros por desempenho e setor.',
    url: 'https://br.tradingview.com/markets/stocks-brazil/',
  },
  {
    nome: 'Investing.com — Gráficos',
    tipo: 'Gráficos',
    descricao: 'Gráficos interativos para acompanhar o preço de vários ativos.',
    url: 'https://br.investing.com/charts',
  },
  {
    nome: 'B3 — Histórico de mercado',
    tipo: 'Dados históricos',
    descricao: 'Séries históricas de cotações publicadas pela própria B3.',
    url: 'https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/',
  },
]
