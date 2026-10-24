'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { obterUsuario } from '@/features/auth/sessao'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'
import { CODIGO_CONVITE, COOKIE_CONVITE } from './convite'

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; mensagem: string }

const codigoSchema = z.string().regex(CODIGO_CONVITE)

async function rpc(
  nome: string,
  args?: Record<string, unknown>,
): Promise<Resultado<{ dado: unknown }>> {
  if (obterModo() !== 'supabase')
    return { ok: false, mensagem: 'A família não funciona no modo demonstração.' }
  if (!(await obterUsuario())) return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' }
  const supabase = (await criarClienteServidor()) as unknown as SupabaseClient
  const { data, error } = await supabase.rpc(nome, args)
  if (error) {
    // P0001 = mensagem escrita por nós nas funções do banco; o resto fica genérico.
    const mensagem =
      error.code === 'P0001' ? error.message : 'Não foi possível concluir. Tente de novo.'
    return { ok: false, mensagem }
  }
  return { ok: true, dado: data }
}

/** Cria um link de convite válido por 7 dias. */
export async function criarConvite(): Promise<Resultado<{ link: string }>> {
  const r = await rpc('criar_convite')
  if (!r.ok) return r
  const origem = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return { ok: true, link: `${origem}/convite/${r.dado as string}` }
}

export async function removerMembro(membro: unknown): Promise<Resultado> {
  const id = z.string().uuid().safeParse(membro)
  if (!id.success) return { ok: false, mensagem: 'Pessoa inválida.' }
  const r = await rpc('remover_membro', { p_membro: id.data })
  if (r.ok) revalidatePath('/', 'layout')
  return r.ok ? { ok: true } : r
}

export async function sairDaFamilia(): Promise<Resultado> {
  const r = await rpc('sair_da_familia')
  if (r.ok) revalidatePath('/', 'layout')
  return r.ok ? { ok: true } : r
}

export async function aceitarConvite(codigo: unknown): Promise<Resultado> {
  const c = codigoSchema.safeParse(codigo)
  if (!c.success) return { ok: false, mensagem: 'Convite inválido.' }
  const r = await rpc('aceitar_convite', { p_codigo: c.data })
  ;(await cookies()).delete(COOKIE_CONVITE)
  if (!r.ok) return r
  revalidatePath('/', 'layout')
  redirect('/')
}

/** Quem abriu o convite sem estar logado: guarda o código e vai para o login. */
export async function lembrarConvite(codigo: unknown): Promise<void> {
  const c = codigoSchema.safeParse(codigo)
  if (c.success)
    (await cookies()).set(COOKIE_CONVITE, c.data, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
  redirect('/login')
}
