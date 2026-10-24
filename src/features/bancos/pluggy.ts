import 'server-only'
import { PluggyClient } from 'pluggy-sdk'
import { adminAtivo } from '@/lib/supabase/admin'

// Open Finance pela Pluggy (pluggy.ai), agregadora autorizada que conversa com os bancos.
// Variáveis: PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_WEBHOOK_SEGREDO e, para testar com
// bancos de mentira, PLUGGY_SANDBOX=1.

export function pluggyAtivo(): boolean {
  return Boolean(
    process.env.PLUGGY_CLIENT_ID?.trim() &&
    process.env.PLUGGY_CLIENT_SECRET?.trim() &&
    adminAtivo(),
  )
}

export const pluggySandbox = () => process.env.PLUGGY_SANDBOX === '1'

let cliente: PluggyClient | null = null
/** O SDK guarda e renova a chave de acesso sozinho. */
export function clientePluggy(): PluggyClient {
  cliente ??= new PluggyClient({
    clientId: process.env.PLUGGY_CLIENT_ID!,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
  })
  return cliente
}

/** Endereço que a Pluggy chama a cada novidade, com o segredo na própria URL. */
export function urlDoWebhook(origem: string): string | undefined {
  const segredo = process.env.PLUGGY_WEBHOOK_SEGREDO
  if (!segredo || !origem.startsWith('https://')) return undefined
  return `${origem}/api/pluggy?segredo=${encodeURIComponent(segredo)}`
}
