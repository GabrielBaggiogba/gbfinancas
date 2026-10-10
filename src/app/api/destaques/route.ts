import { NextResponse } from 'next/server'
import { obterDestaques } from '@/features/mercado/servidor'

export const dynamic = 'force-dynamic'

// Destaques da semana para a faixa do topo. Só para quem está logado (middleware).
export async function GET() {
  const destaques = await obterDestaques()
  return NextResponse.json(destaques, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
