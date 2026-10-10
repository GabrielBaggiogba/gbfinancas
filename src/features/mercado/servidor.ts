import 'server-only'
import { unstable_cache } from 'next/cache'
import { FONTE_DADOS, lerListaBrapi, type Mercado } from './acoes'

// Lista de ações da B3 pela API pública da brapi.dev. Funciona sem chave; com
// BRAPI_TOKEN (opcional, Vercel → Settings → Environment Variables) a chave vai
// no cabeçalho e valem os limites do seu plano. Os dados chegam com atraso (no
// plano gratuito, cerca de 30 minutos) e ficam guardados aqui por 15 minutos.

const ENDERECO =
  'https://brapi.dev/api/quote/list?type=stock&limit=2000&sortBy=volume&sortOrder=desc'
const VALIDADE_SEGUNDOS = 15 * 60
const ESPERA_MS = 10_000

function enderecoDaLista(): string {
  // Só para conferir as telas sem internet, no modo demonstração.
  const teste = process.env.GBF_MERCADO_DE_TESTE
  if (teste && process.env.GBF_MODO_DEMO === '1' && process.env.VERCEL_ENV !== 'production')
    return teste
  return ENDERECO
}

async function buscar(endereco: string): Promise<Mercado> {
  const token = process.env.BRAPI_TOKEN?.trim()
  const resposta = await fetch(endereco, {
    cache: 'no-store',
    signal: AbortSignal.timeout(ESPERA_MS),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'GBFinancas/1.0 (+https://gbfinancas.vercel.app)',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
  const acoes = lerListaBrapi(await resposta.json())
  // Lista vazia lança: assim ela não fica guardada e a próxima visita tenta de novo.
  if (acoes.length < 20) throw new Error(`Só ${acoes.length} ações na resposta`)
  return {
    situacao: 'ok',
    acoes,
    consultado_em: new Date().toISOString(),
    fonte: FONTE_DADOS,
  }
}

const emCache = unstable_cache(buscar, ['mercado-v1'], {
  revalidate: VALIDADE_SEGUNDOS,
  tags: ['mercado'],
})

/** Ações da B3, guardadas por 15 minutos. Nunca lança. */
export async function obterMercado(): Promise<Mercado> {
  try {
    return await emCache(enderecoDaLista())
  } catch (e) {
    console.error('[mercado]', e instanceof Error ? e.message : e)
    return { situacao: 'indisponivel' }
  }
}
