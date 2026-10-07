import 'server-only'
import { createHash } from 'node:crypto'
import { unstable_cache } from 'next/cache'
import { FONTES, type Fonte } from './fontes'
import { lerFeed } from './rss'
import { classificar } from './temas'
import type { Noticia, Noticias, SituacaoDaFonte } from './tipos'

const VALIDADE_SEGUNDOS = 30 * 60
const ESPERA_MS = 7000
const POR_FONTE = 20
const MAXIMO = 120

function listaDeFontes(): Fonte[] {
  // Só para conferir a tela sem internet, no modo demonstração.
  const teste = process.env.GBF_FEED_DE_TESTE
  if (teste && process.env.GBF_MODO_DEMO === '1' && process.env.VERCEL_ENV !== 'production')
    return [{ id: 'teste', nome: 'Feed de teste', url: teste }]
  return FONTES
}

async function lerFonte(fonte: Fonte): Promise<Noticia[]> {
  const resposta = await fetch(fonte.url, {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(ESPERA_MS),
    headers: {
      'User-Agent': 'GBFinancas/1.0 (+https://gbfinancas.vercel.app; leitor de RSS)',
      Accept:
        'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
    },
  })
  if (!resposta.ok) throw new Error(`${fonte.id}: HTTP ${resposta.status}`)
  const xml = (await resposta.text()).slice(0, 3_000_000)
  const noticias: Noticia[] = []
  for (const item of lerFeed(xml, fonte.url)) {
    const tema = classificar(item.titulo, item.categorias)
    if (fonte.soFinancas && tema === 'geral') continue
    noticias.push({
      id: createHash('sha1').update(item.link).digest('hex').slice(0, 16),
      titulo: item.titulo,
      resumo: item.resumo,
      link: item.link,
      imagem: item.imagem,
      publicado_em: item.publicado_em,
      fonte: fonte.nome,
      fonte_id: fonte.id,
      tema,
    })
    if (noticias.length >= POR_FONTE) break
  }
  return noticias
}

async function buscar(): Promise<Noticias> {
  const fontes = listaDeFontes()
  const resultados = await Promise.allSettled(fontes.map(lerFonte))
  const situacao: SituacaoDaFonte[] = []
  const vistos = new Set<string>()
  const itens: Noticia[] = []
  resultados.forEach((r, i) => {
    const lista = r.status === 'fulfilled' ? r.value : []
    situacao.push({
      id: fontes[i].id,
      nome: fontes[i].nome,
      ok: r.status === 'fulfilled',
      itens: lista.length,
    })
    for (const n of lista) {
      if (vistos.has(n.id)) continue
      vistos.add(n.id)
      itens.push(n)
    }
  })
  // Sem nenhuma notícia, lança: assim o resultado vazio não fica guardado por meia hora.
  if (itens.length === 0) throw new Error('Nenhuma fonte respondeu.')
  itens.sort((a, b) => (b.publicado_em ?? '').localeCompare(a.publicado_em ?? ''))
  return {
    itens: itens.slice(0, MAXIMO),
    fontes: situacao,
    atualizado_em: new Date().toISOString(),
  }
}

const emCache = unstable_cache(buscar, ['noticias-v1'], {
  revalidate: VALIDADE_SEGUNDOS,
  tags: ['noticias'],
})

/**
 * Notícias dos feeds, guardadas por 30 minutos. Quem abre a página recebe a cópia
 * guardada na hora; passado o prazo, o servidor renova em segundo plano.
 */
export async function obterNoticias(): Promise<Noticias> {
  try {
    return await emCache()
  } catch {
    return {
      itens: [],
      fontes: listaDeFontes().map((f) => ({ id: f.id, nome: f.nome, ok: false, itens: 0 })),
      atualizado_em: new Date().toISOString(),
    }
  }
}
