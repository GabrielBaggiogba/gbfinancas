import { NextResponse } from 'next/server'
import { enviarLembretes } from '@/features/avisos/lembretes'
import { adminAtivo } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Chamado pela Vercel Cron todo dia (vercel.json). A Vercel manda "Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || request.headers.get('authorization') !== `Bearer ${segredo}`)
    return new Response('Proibido', { status: 401 })
  if (!adminAtivo())
    return NextResponse.json({ ok: false, motivo: 'sem SUPABASE_SERVICE_ROLE_KEY' })
  try {
    return NextResponse.json({ ok: true, ...(await enviarLembretes()) })
  } catch (e) {
    console.error('[lembretes]', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
