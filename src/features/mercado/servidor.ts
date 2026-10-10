import 'server-only'
import { unstable_cache } from 'next/cache'
import { hojeEmSaoPaulo } from '@/lib/datas'
import { normalizar } from './destaques'
import type { Destaques } from './tipos'

// A faixa "Destaques da semana" lê uma API de cotações configurada por variável de
// ambiente. Sem ela, a faixa mostra "Dados semanais indisponíveis": nada é inventado
// e nenhuma página é raspada. O formato esperado está no README.

const VALIDADE_SEGUNDOS = 30 * 60
const ESPERA_MS = 7000

type Configuracao = { url: string; chave: string; fonte: string }

function configuracao(): Configuracao | null {
  const bruta = process.env.GBF_DESTAQUES_API_URL?.trim()
  if (!bruta) return null
  try {
    const url = new URL(bruta)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return {
      url: url.toString(),
      chave: process.env.GBF_DESTAQUES_API_CHAVE?.trim() ?? '',
      fonte: process.env.GBF_DESTAQUES_FONTE?.trim() || url.hostname,
    }
  } catch {
    return null
  }
}

async function buscar(): Promise<Destaques> {
  const c = configuracao()
  if (!c) throw new Error('destaques: API não configurada')
  const cabecalhos: Record<string, string> = { Accept: 'application/json' }
  if (c.chave) cabecalhos.Authorization = `Bearer ${c.chave}`
  const resposta = await fetch(c.url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(ESPERA_MS),
    headers: cabecalhos,
  })
  if (!resposta.ok) throw new Error(`destaques: HTTP ${resposta.status}`)
  const dados = normalizar(await resposta.json(), {
    fontePadrao: c.fonte,
    hoje: hojeEmSaoPaulo(),
  })
  // Falha lança: assim ela não fica guardada por meia hora.
  if (dados.situacao === 'indisponivel' && dados.motivo === 'falha')
    throw new Error('destaques: resposta inválida')
  return dados
}

const emCache = unstable_cache(buscar, ['destaques-v1'], {
  revalidate: VALIDADE_SEGUNDOS,
  tags: ['destaques'],
})

/** Ativos em alta na semana, guardados por 30 minutos. Nunca lança. */
export async function obterDestaques(): Promise<Destaques> {
  if (!configuracao()) return { situacao: 'indisponivel', motivo: 'nao-configurado' }
  try {
    return await emCache()
  } catch {
    return { situacao: 'indisponivel', motivo: 'falha' }
  }
}
