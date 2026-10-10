import { NextResponse } from 'next/server'
import { obterDestaques } from '@/features/mercado/servidor'

export const dynamic = 'force-dynamic'

// Ativos em alta na semana, para a faixa do topo. Só dados de mercado, nada do usuário.
export async function GET() {
  return NextResponse.json(await obterDestaques(), {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}
