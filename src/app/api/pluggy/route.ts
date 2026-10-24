import { timingSafeEqual } from 'node:crypto'
import { after, NextResponse } from 'next/server'
import { pluggyAtivo } from '@/features/bancos/pluggy'
import { sincronizarConexao } from '@/features/bancos/sincronizar'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const segredoConfere = (recebido: string | null) => {
  const esperado = process.env.PLUGGY_WEBHOOK_SEGREDO
  if (!esperado || !recebido) return false
  const a = Buffer.from(esperado)
  const b = Buffer.from(recebido)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Avisos da Pluggy (novas transações, conexão atualizada). O corpo só diz QUAL conexão mudou:
// os dados em si são buscados de novo na Pluggy, nunca lidos daqui.
export async function POST(request: Request) {
  if (!pluggyAtivo()) return new Response('Desligado', { status: 404 })
  if (!segredoConfere(new URL(request.url).searchParams.get('segredo')))
    return new Response('Proibido', { status: 401 })
  let corpo: { event?: string; itemId?: string }
  try {
    corpo = (await request.json()) as typeof corpo
  } catch {
    return new Response('JSON inválido', { status: 400 })
  }
  const itemId = typeof corpo.itemId === 'string' ? corpo.itemId : null
  const interessa =
    /^(item\/(updated|error|login_succeeded|waiting_user_action)|transactions\/(created|updated))$/.test(
      corpo.event ?? '',
    )
  // A Pluggy espera resposta em até 10 s: responde e sincroniza depois.
  if (itemId && interessa)
    after(() =>
      sincronizarConexao(itemId).catch((e) =>
        console.error('[pluggy]', itemId, e instanceof Error ? e.message : e),
      ),
    )
  return NextResponse.json({ ok: true })
}
