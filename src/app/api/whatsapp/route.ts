import { after, NextResponse } from 'next/server'
import { assinaturaValida, whatsappAtivo } from '@/features/whatsapp/api'
import { processarMensagem, type MensagemRecebida } from '@/features/whatsapp/processar'

export const dynamic = 'force-dynamic'
// A leitura com IA de uma foto pode levar alguns segundos.
export const maxDuration = 60

// Verificação do webhook pela Meta (uma vez, ao configurar).
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams
  const token = process.env.WHATSAPP_VERIFY_TOKEN
  if (token && p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === token)
    return new Response(p.get('hub.challenge') ?? '', { status: 200 })
  return new Response('Proibido', { status: 403 })
}

type Corpo = {
  entry?: { changes?: { value?: { messages?: MensagemRecebida[] } }[] }[]
}

export async function POST(request: Request) {
  if (!whatsappAtivo()) return new Response('Desligado', { status: 404 })
  const bruto = await request.text()
  if (!assinaturaValida(bruto, request.headers.get('x-hub-signature-256')))
    return new Response('Assinatura inválida', { status: 401 })
  let corpo: Corpo
  try {
    corpo = JSON.parse(bruto) as Corpo
  } catch {
    return new Response('JSON inválido', { status: 400 })
  }
  const mensagens = (corpo.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .flatMap((c) => c.value?.messages ?? [])
    .filter((m) => typeof m?.id === 'string' && /^\d{8,15}$/.test(m?.from ?? ''))
  // Responde na hora (a Meta reenvia se demorar) e processa em seguida.
  after(async () => {
    for (const m of mensagens) {
      await processarMensagem(m).catch((e) =>
        console.error('[whatsapp]', e instanceof Error ? e.message : e),
      )
    }
  })
  return NextResponse.json({ ok: true })
}
