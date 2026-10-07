import { NextResponse } from 'next/server'
import { obterNoticias } from '@/features/noticias/servidor'

export const dynamic = 'force-dynamic'

// Notícias públicas dos feeds (nada do usuário passa por aqui). `?limite=4` devolve só as primeiras.
export async function GET(request: Request) {
  const limite = Number(new URL(request.url).searchParams.get('limite'))
  const noticias = await obterNoticias()
  const itens =
    Number.isInteger(limite) && limite > 0
      ? noticias.itens.slice(0, Math.min(limite, 120))
      : noticias.itens
  return NextResponse.json(
    { ...noticias, itens, total: noticias.itens.length },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } },
  )
}
