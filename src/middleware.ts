import { NextResponse, type NextRequest } from 'next/server'
import { obterModo } from '@/lib/modo'
import { atualizarSessao } from '@/lib/supabase/middleware'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/).*)',
  ],
}

export async function middleware(request: NextRequest) {
  const modo = obterModo()
  const { pathname } = request.nextUrl

  const ir = (caminho: string, cookiesDe?: NextResponse) => {
    const url = request.nextUrl.clone()
    url.pathname = caminho
    url.search = ''
    const redirecionamento = NextResponse.redirect(url)
    cookiesDe?.cookies.getAll().forEach((c) => redirecionamento.cookies.set(c))
    return redirecionamento
  }

  if (modo === 'pendente') {
    return pathname === '/configuracao' ? NextResponse.next() : ir('/configuracao')
  }
  if (pathname === '/configuracao') return ir('/')

  let resposta = NextResponse.next()
  let logado: boolean
  if (modo === 'supabase') {
    const resultado = await atualizarSessao(request)
    resposta = resultado.resposta
    logado = resultado.usuario !== null
  } else {
    logado = request.cookies.has('gbf_demo_sessao')
  }

  const publica =
    pathname === '/login' || pathname.startsWith('/auth/') || pathname === '/api/noticias'
  const origem = modo === 'supabase' ? resposta : undefined

  if (!logado && !publica) return ir('/login', origem)
  if (logado && pathname === '/login') return ir('/', origem)
  return resposta
}
