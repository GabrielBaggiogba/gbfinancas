// Feeds públicos (RSS ou Atom) de portais brasileiros de finanças. Conferidos em
// 07/10/2026. Para acrescentar uma fonte, basta uma linha aqui.

export type Fonte = {
  id: string
  nome: string
  url: string
  /** Feed geral do portal: fica só o que for claramente de finanças. */
  soFinancas?: boolean
}

export const FONTES: Fonte[] = [
  { id: 'infomoney', nome: 'InfoMoney', url: 'https://www.infomoney.com.br/feed/' },
  { id: 'moneytimes', nome: 'Money Times', url: 'https://www.moneytimes.com.br/feed/' },
  { id: 'seudinheiro', nome: 'Seu Dinheiro', url: 'https://www.seudinheiro.com/feed/' },
  { id: 'suno', nome: 'Suno Notícias', url: 'https://www.suno.com.br/noticias/feed/' },
  { id: 'investnews', nome: 'InvestNews', url: 'https://investnews.com.br/feed/' },
  { id: 'exame', nome: 'Exame', url: 'https://exame.com/feed/', soFinancas: true },
  {
    id: 'agenciabrasil',
    nome: 'Agência Brasil',
    url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
  },
  {
    id: 'bcb',
    nome: 'Banco Central',
    url: 'https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias',
  },
]
