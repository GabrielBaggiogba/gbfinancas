import { NextResponse } from 'next/server'
import { pluggyAtivo } from '@/features/bancos/pluggy'
import { sincronizarTodas } from '@/features/bancos/sincronizar'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Rede de segurança diária: se algum aviso da Pluggy se perdeu, os lançamentos chegam aqui.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || request.headers.get('authorization') !== `Bearer ${segredo}`)
    return new Response('Proibido', { status: 401 })
  if (!pluggyAtivo()) return NextResponse.json({ ok: false, motivo: 'Pluggy não configurada' })
  return NextResponse.json({ ok: true, ...(await sincronizarTodas()) })
}
