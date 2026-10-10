'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'
import { traduzirErroAuth } from './erros'
import { cadastroSchema, credenciaisSchema } from './esquemas'

export type ResultadoAuth =
  { ok: false; mensagem: string } | { ok: true; confirmar: true; email: string }

const SEM_CONEXAO = 'Sem conexão com o servidor. Tente de novo.'
const COOKIE_SESSAO_DEMO = 'gbf_demo_sessao'

async function abrirSessaoDemo(email: string) {
  ;(await cookies()).set(COOKIE_SESSAO_DEMO, email, {
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
    await abrirSessaoDemo(email)
  } else if (modo === 'supabase') {
    let erro
    try {
      const supabase = await criarClienteServidor()
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
  const analise = cadastroSchema.safeParse(dados)
  if (!analise.success) return { ok: false, mensagem: analise.error.issues[0].message }
  const { email, senha } = analise.data

  const modo = obterModo()
  if (modo === 'demo') {
    await abrirSessaoDemo(email)
    revalidatePath('/', 'layout')
    redirect('/')
  }
  if (modo !== 'supabase') return { ok: false, mensagem: 'Falta conectar o Supabase.' }

  const origem =
    (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  let resultado
  try {
    const supabase = await criarClienteServidor()
    resultado = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${origem}/auth/callback` },
    })
  } catch {
    return { ok: false, mensagem: SEM_CONEXAO }
  }
  const { data, error } = resultado
  // E-mail que já tem conta recebe a mesma resposta de um cadastro novo, para a tela
  // não revelar quem é cliente.
  if (error && error.code !== 'user_already_exists' && error.code !== 'email_exists')
    return { ok: false, mensagem: traduzirErroAuth(error) }
  if (data?.session) {
    revalidatePath('/', 'layout')
    redirect('/')
  }
  return { ok: true, confirmar: true, email }
}

export async function sair(): Promise<void> {
  const modo = obterModo()
  if (modo === 'supabase') {
    try {
      await (await criarClienteServidor()).auth.signOut()
    } catch {
      // Sem rede, o cookie local ainda é descartado pelo redirecionamento do middleware.
    }
  } else if (modo === 'demo') {
    ;(await cookies()).delete(COOKIE_SESSAO_DEMO)
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}

/** Exclui a conta de acesso e, em cascata, todos os dados. Só devolve algo se falhar. */
export async function excluirConta(): Promise<{ ok: false; mensagem: string }> {
  const modo = obterModo()
  if (modo === 'supabase') {
    try {
      const supabase = await criarClienteServidor()
      const { error } = await supabase.rpc('excluir_minha_conta')
      if (error) return { ok: false, mensagem: 'Não foi possível excluir a conta. Tente de novo.' }
      // A conta já não existe; isto só descarta os cookies da sessão.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    } catch {
      return { ok: false, mensagem: SEM_CONEXAO }
    }
  } else if (modo === 'demo') {
    ;(await cookies()).delete(COOKIE_SESSAO_DEMO)
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}
