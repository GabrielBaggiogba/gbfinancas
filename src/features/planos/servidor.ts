import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Usuario } from '@/features/auth/sessao'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'
import { acessoTotal, cobrancaAtiva, type PlanoDoUsuario } from './planos'

export type Assinatura = { plano: PlanoDoUsuario; acessoTotal: boolean }

/** Plano da conta. Sem a tabela `perfis` (migration não aplicada), vale o acesso total. */
export async function obterAssinatura(usuario: Usuario): Promise<Assinatura> {
  const cobranca = cobrancaAtiva()
  if (obterModo() !== 'supabase') return { plano: 'fundador', acessoTotal: true }
  const supabase = (await criarClienteServidor()) as unknown as SupabaseClient
  const { data, error } = await supabase
    .from('perfis')
    .select('plano')
    .eq('user_id', usuario.id)
    .maybeSingle()
  const plano = (error ? null : (data?.plano ?? null)) as PlanoDoUsuario
  return { plano, acessoTotal: acessoTotal(plano, cobranca) }
}
