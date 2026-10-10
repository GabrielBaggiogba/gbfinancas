import 'server-only'
import { unstable_cache } from 'next/cache'
import { calcularDestaques, type Destaques } from './destaques'

// Busca os destaques na API configurada. Variáveis (Vercel → Settings → Environment Variables):
//   GBF_DESTAQUES_URL    endereço que devolve o JSON descrito em destaques.ts (obrigatória)
//   GBF_DESTAQUES_TOKEN  opcional: vai no cabeçalho "Authorization: Bearer <token>"
//   GBF_DESTAQUES_FONTE  opcional: nome da fonte exibido na faixa, no lugar do que a API mandar

const VALIDADE_SEGUNDOS = 15 * 60
const ESPERA_MS = 8000
const TAMANHO_MAX = 2_000_000

function configuracao() {
  const url = process.env.GBF_DESTAQUES_URL?.trim()
  if (!url) return null
  let endereco: URL
  try {
    endereco = new URL(url)
  } catch {
    console.error('[destaques] GBF_DESTAQUES_URL inválida')
    return null
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(endereco.hostname)
  if (endereco.protocol !== 'https:' && !(local && endereco.protocol === 'http:')) {
    console.error('[destaques] GBF_DESTAQUES_URL precisa usar https')
    return null
  }
  return {
    url: endereco.toString(),
    fonte: process.env.GBF_DESTAQUES_FONTE?.trim() || undefined,
  }
}

async function buscar(url: string, fonte: string | undefined) {
  const token = process.env.GBF_DESTAQUES_TOKEN?.trim()
  const resposta = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(ESPERA_MS),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'GBFinancas/1.0 (+https://gbfinancas.vercel.app)',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
  const texto = await resposta.text()
  if (texto.length > TAMANHO_MAX) throw new Error('Resposta grande demais')
  // Se falhar, lança: o erro não fica guardado e a próxima visita tenta de novo.
  return calcularDestaques(JSON.parse(texto), { fonte })
}

// A chave inclui o endereço: trocar a API não reaproveita o resultado da anterior.
// O token é lido dentro da busca e não entra na chave do cache.
const emCache = unstable_cache(buscar, ['destaques-v1'], {
  revalidate: VALIDADE_SEGUNDOS,
  tags: ['destaques'],
})

/** Destaques da semana, guardados por 15 minutos. Nunca lança. */
export async function obterDestaques(): Promise<Destaques> {
  const config = configuracao()
  if (!config) return { situacao: 'indisponivel', motivo: 'nao-configurado' }
  try {
    return await emCache(config.url, config.fonte)
  } catch (e) {
    console.error('[destaques]', e instanceof Error ? e.message : e)
    return { situacao: 'indisponivel', motivo: 'falhou' }
  }
}
