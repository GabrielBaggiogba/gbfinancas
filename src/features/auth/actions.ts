'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'
import { traduzirErroAuth } from './erros'
import { credenciaisSchema } from './esquemas'

export type ResultadoAuth =
  { ok: false; mensagem: string } | { ok: true; confirmar: true; email: string }

const SEM_CONEXAO = 'Sem conexão com o servidor. Tente de novo.'
const COOKIE_SESSAO_DEMO = 'gbf_demo_sessao'

function abrirSessaoDemo(email: string) {
  cookies().set(COOKIE_SESSAO_DEMO, email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function entrar(dados: unknown): Promise<ResultadoAuth> {
  const analise = credenciaisSchema.safeParse(dados)
  if (!analise.success) return { ok: false, mensagem: analise.error.issues[0].message }
  const { email, senha } = analise.data

  const modo = obterModo()
  if (modo === 'demo') {
    abrirSessaoDemo(email)
  } else if (modo === 'supabase') {
    let erro
    try {
      const supabase = criarClienteServidor()
      const resposta = await supabase.auth.signInWithPassword({ email, password: senha })
      erro = resposta.error
    } catch {
      return { ok: false, mensagem: SEM_CONEXAO }
    }
    if (erro) return { ok: false, mensagem: traduzirErroAuth(erro) }
  } else {
    return { ok: false, mensagem: 'Falta conectar o Supabase.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function cadastrar(dados: unknown): Promise<ResultadoAuth> {
  const analise = credenciaisSchema.safeParse(dados)
  if (!analise.success) return { ok: false, mensagem: analise.error.issues[0].message }
  const { email, senha } = analise.data

  const modo = obterModo()
  if (modo === 'demo') {
    abrirSessaoDemo(email)
    revalidatePath('/', 'layout')
    redirect('/')
  }
  if (modo !== 'supabase') return { ok: false, mensagem: 'Falta conectar o Supabase.' }

  const origem =
    headers().get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  let resultado
  try {
    const supabase = criarClienteServidor()
    resultado = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${origem}/auth/callback` },
    })
  } catch {
    return { ok: false, mensagem: SEM_CONEXAO }
  }
  const { data, error } = resultado
  if (error) return { ok: false, mensagem: traduzirErroAuth(error) }
  if (data.user?.identities?.length === 0) {
    return { ok: false, mensagem: 'Este e-mail já tem conta. Entre com sua senha.' }
  }
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/')
  }
  return { ok: true, confirmar: true, email }
}

export async function sair(): Promise<void> {
  const modo = obterModo()
  if (modo === 'supabase') {
    try {
      await criarClienteServidor().auth.signOut()
    } catch {
      // Sem rede, o cookie local ainda é descartado pelo redirecionamento do middleware.
    }
  } else if (modo === 'demo') {
    cookies().delete(COOKIE_SESSAO_DEMO)
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}
