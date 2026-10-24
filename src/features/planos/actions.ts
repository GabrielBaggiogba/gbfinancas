'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'

const entradaSchema = z.object({
  email: z.string().trim().toLowerCase().email('Digite um e-mail válido.').max(254),
  plano: z.enum(['essencial', 'completo', 'familia']).nullable(),
})

export type ResultadoLista = { ok: true } | { ok: false; mensagem: string }

/** Guarda o e-mail de quem quer assinar quando a cobrança abrir. */
export async function entrarNaLista(dados: unknown): Promise<ResultadoLista> {
  const r = entradaSchema.safeParse(dados)
  if (!r.success) return { ok: false, mensagem: r.error.issues[0].message }
  if (obterModo() !== 'supabase') return { ok: true } // modo demonstração: não guarda nada
  try {
    const supabase = (await criarClienteServidor()) as unknown as SupabaseClient
    const { error } = await supabase.from('lista_espera').insert(r.data)
    // E-mail repetido conta como sucesso: a pessoa já está na lista.
    if (error && error.code !== '23505')
      return { ok: false, mensagem: 'Não foi possível entrar na lista. Tente de novo.' }
    return { ok: true }
  } catch {
    return { ok: false, mensagem: 'Sem conexão com o servidor. Tente de novo.' }
  }
}
