'use server'

import { randomInt } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { obterUsuario } from '@/features/auth/sessao'
import { whatsappAtivo } from '@/features/whatsapp/api'
import { obterModo } from '@/lib/modo'
import { clienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/server'

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; mensagem: string }
const SESSAO = 'Sua sessão expirou. Entre de novo.'

const preferenciasSchema = z.object({
  avisos_email: z.boolean(),
  avisos_whatsapp: z.boolean(),
  antecedencia_dias: z.number().int().min(0).max(15),
})

export async function salvarAvisos(dados: unknown): Promise<Resultado> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  const r = preferenciasSchema.safeParse(dados)
  if (!r.success || obterModo() !== 'supabase') return { ok: false, mensagem: 'Dados inválidos.' }
  const supabase = (await criarClienteServidor()) as unknown as SupabaseClient
  const { error } = await supabase.from('perfis').update(r.data).eq('user_id', usuario.id)
  if (error) return { ok: false, mensagem: 'Não foi possível salvar. Tente de novo.' }
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Gera o código de 6 dígitos que a pessoa manda ao WhatsApp do app (vale 15 minutos). */
export async function gerarCodigoWhatsApp(): Promise<Resultado<{ codigo: string }>> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  if (!whatsappAtivo()) return { ok: false, mensagem: 'O WhatsApp não está configurado.' }
  const admin = clienteAdmin()
  const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0')
    // Evita dois códigos iguais valendo ao mesmo tempo.
    const { count } = await admin
      .from('perfis')
      .select('user_id', { count: 'exact', head: true })
      .eq('whatsapp_codigo', codigo)
      .gt('whatsapp_codigo_expira', new Date().toISOString())
    if (count) continue
    const { error } = await admin
      .from('perfis')
      .update({ whatsapp_codigo: codigo, whatsapp_codigo_expira: expira })
      .eq('user_id', usuario.id)
    if (error) break
    return { ok: true, codigo }
  }
  return { ok: false, mensagem: 'Não foi possível gerar o código. Tente de novo.' }
}

export async function desvincularWhatsApp(): Promise<Resultado> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  if (!whatsappAtivo()) return { ok: false, mensagem: 'O WhatsApp não está configurado.' }
  const { error } = await clienteAdmin()
    .from('perfis')
    .update({ telefone: null })
    .eq('user_id', usuario.id)
  if (error) return { ok: false, mensagem: 'Não foi possível desvincular.' }
  revalidatePath('/', 'layout')
  return { ok: true }
}
