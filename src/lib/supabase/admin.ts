import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cliente com a chave service_role: ignora o RLS. Só para o que roda sem a sessão da pessoa
// (webhook do WhatsApp, lembretes agendados). Toda consulta feita com ele precisa filtrar
// por user_id explicitamente.

export function adminAtivo(): boolean {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && process.env.NEXT_PUBLIC_SUPABASE_URL,
  )
}

export function clienteAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
