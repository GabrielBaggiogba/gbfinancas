import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Usuario } from '@/features/auth/sessao'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'
import { acessoTotal, cobrancaAtiva, type PlanoDoUsuario } from './planos'

export type PreferenciasDeAviso = {
  telefone: string | null
  avisos_email: boolean
  avisos_whatsapp: boolean
  antecedencia_dias: number
}

export type Assinatura = {
  plano: PlanoDoUsuario
  acessoTotal: boolean
  /** Sem a tabela `perfis` (migration não aplicada), fica null e os avisos somem da tela. */
  avisos: PreferenciasDeAviso | null
}

/** Plano e preferências da conta. Sem a tabela `perfis`, vale o acesso total. */
export async function obterAssinatura(usuario: Usuario): Promise<Assinatura> {
  const cobranca = cobrancaAtiva()
  if (obterModo() !== 'supabase') return { plano: 'fundador', acessoTotal: true, avisos: null }
  const supabase = (await criarClienteServidor()) as unknown as SupabaseClient
  const { data, error } = await supabase
    .from('perfis')
    .select('plano, telefone, avisos_email, avisos_whatsapp, antecedencia_dias')
    .eq('user_id', usuario.id)
    .maybeSingle()
  // Sem a tabela (migration pendente), as contas atuais são tratadas como fundadoras.
  if (error) return { plano: 'fundador', acessoTotal: true, avisos: null }
  if (!data) return { plano: null, acessoTotal: acessoTotal(null, cobranca), avisos: null }
  const plano = (data.plano ?? null) as PlanoDoUsuario
  const { plano: _p, ...avisos } = data as PreferenciasDeAviso & { plano: string | null }
  return { plano, acessoTotal: acessoTotal(plano, cobranca), avisos }
}
