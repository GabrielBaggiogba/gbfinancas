import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cache } from 'react'
import type { Usuario } from '@/features/auth/sessao'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'

export type Familia = {
  /** Sem a migration da família, o recurso fica escondido. */
  disponivel: boolean
  papel: 'sozinho' | 'dono' | 'membro'
  /** Dono das finanças que a pessoa está usando (ela mesma, se não for membro). */
  donoId: string
  donoEmail: string
  membros: { id: string; email: string }[]
}

/** A família de quem está logado. Uma consulta por requisição. */
export const obterFamilia = cache(async (usuario: Usuario): Promise<Familia> => {
  const sozinho: Familia = {
    disponivel: false,
    papel: 'sozinho',
    donoId: usuario.id,
    donoEmail: usuario.email,
    membros: [],
  }
  if (obterModo() !== 'supabase') return sozinho
  const supabase = (await criarClienteServidor()) as unknown as SupabaseClient
  const { data, error } = await supabase.rpc('minha_familia')
  if (error || !Array.isArray(data) || data.length === 0) return sozinho
  const linhas = data as {
    dono: string
    dono_email: string
    membro: string | null
    membro_email: string | null
  }[]
  const donoId = linhas[0].dono
  const membros = linhas
    .filter((l) => l.membro)
    .map((l) => ({ id: l.membro as string, email: l.membro_email ?? '' }))
  return {
    disponivel: true,
    papel: donoId !== usuario.id ? 'membro' : membros.length ? 'dono' : 'sozinho',
    donoId,
    donoEmail: linhas[0].dono_email,
    membros,
  }
})
