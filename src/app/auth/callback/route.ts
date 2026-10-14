import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'

// Sempre redireciona para um caminho fixo; nunca lê um parâmetro `next`.
function para(request: NextRequest, caminho: string) {
  const url = request.nextUrl.clone()
  const [pathname, search = ''] = caminho.split('?')
  url.pathname = pathname
  url.search = search ? `?${search}` : ''
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  if (obterModo() !== 'supabase') return para(request, '/')

  const params = request.nextUrl.searchParams
  if (params.get('error') || params.get('error_description'))
    return para(request, '/login?erro=link')

  const tokenHash = params.get('token_hash')
  const tipo = params.get('type')
  const codigo = params.get('code')
  const supabase = await criarClienteServidor()

  try {
    if (tokenHash && tipo) {
      const { error } = await supabase.auth.verifyOtp({
        type: tipo as EmailOtpType,
        token_hash: tokenHash,
      })
      return para(request, error ? '/login?erro=link' : '/')
    }
    if (codigo) {
      const { error } = await supabase.auth.exchangeCodeForSession(codigo)
      // Falhou: o link foi aberto em outro navegador; o e-mail já está confirmado.
      return para(request, error ? '/login?aviso=confirmado' : '/')
    }
  } catch {
    return para(request, '/login?erro=link')
  }
  return para(request, '/login?erro=link')
}
