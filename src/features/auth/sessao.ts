import 'server-only'
import { cookies } from 'next/headers'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'

export const COOKIE_SESSAO_DEMO = 'gbf_demo_sessao'

export type Usuario = { id: string; email: string }

export async function obterUsuario(): Promise<Usuario | null> {
  const modo = obterModo()
  if (modo === 'supabase') {
    const supabase = await criarClienteServidor()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user ? { id: user.id, email: user.email ?? '' } : null
  }
  if (modo === 'demo') {
    const valor = (await cookies()).get(COOKIE_SESSAO_DEMO)?.value
    return valor ? { id: 'demo', email: valor } : null
  }
  return null
}
