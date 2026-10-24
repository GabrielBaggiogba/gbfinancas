import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { obterModo } from '@/lib/modo'
import { criarClienteServidor } from '@/lib/supabase/server'

export type ConexaoBancaria = {
  item_id: string
  instituicao: string
  logo: string | null
  cor: string | null
  status: 'atualizando' | 'ok' | 'reconectar' | 'erro'
  detalhe: string | null
  ultima_sincronizacao: string | null
  consentimento_expira: string | null
}

/** Bancos conectados às finanças do dono. Sem a migration, lista vazia. */
export async function obterConexoes(donoId: string): Promise<ConexaoBancaria[]> {
  if (obterModo() !== 'supabase') return []
  const supabase = (await criarClienteServidor()) as unknown as SupabaseClient
  const { data, error } = await supabase
    .from('conexoes_bancarias')
    .select(
      'item_id, instituicao, logo, cor, status, detalhe, ultima_sincronizacao, consentimento_expira',
    )
    .eq('user_id', donoId)
    .order('criado_em')
  return error ? [] : ((data ?? []) as ConexaoBancaria[])
}
