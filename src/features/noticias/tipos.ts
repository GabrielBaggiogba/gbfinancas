export type Tema =
  'investimentos' | 'economia' | 'financas-pessoais' | 'negocios' | 'cripto' | 'geral'

export type Noticia = {
  id: string
  titulo: string
  resumo: string
  link: string
  imagem: string | null
  /** ISO 8601, ou null quando o feed não informa a data. */
  publicado_em: string | null
  fonte: string
  fonte_id: string
  tema: Tema
}

export type SituacaoDaFonte = { id: string; nome: string; ok: boolean; itens: number }

export type Noticias = {
  itens: Noticia[]
  fontes: SituacaoDaFonte[]
  atualizado_em: string
}

export const ROTULO_TEMA: Record<Tema, string> = {
  investimentos: 'Investimentos',
  economia: 'Economia',
  'financas-pessoais': 'Finanças pessoais',
  negocios: 'Negócios',
  cripto: 'Cripto',
  geral: 'Geral',
}
