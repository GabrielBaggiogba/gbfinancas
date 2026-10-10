import { NextResponse } from 'next/server'
import { altasEBaixas } from '@/features/mercado/acoes'
import { obterMercado } from '@/features/mercado/servidor'

export const dynamic = 'force-dynamic'

// Altas e baixas do dia para a faixa do topo. Dados públicos de mercado, nada do usuário.
export async function GET() {
  const mercado = await obterMercado()
  const corpo =
    mercado.situacao === 'ok'
      ? {
          situacao: 'ok' as const,
          consultado_em: mercado.consultado_em,
          fonte: mercado.fonte,
          ...altasEBaixas(mercado.acoes, 8),
        }
      : mercado
  return NextResponse.json(corpo, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  })
}
