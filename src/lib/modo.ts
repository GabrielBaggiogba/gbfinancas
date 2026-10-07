// Decide de onde vêm os dados. Sem `server-only` porque o middleware também importa.
// Sempre chamado dentro de funções: nada lê variável de ambiente no topo do módulo.

export type Modo = 'supabase' | 'demo' | 'pendente'

export function supabaseConfigurado(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!url.startsWith('http') || chave.trim() === '') return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function obterModo(): Modo {
  if (supabaseConfigurado()) return 'supabase'
  if (process.env.GBF_MODO_DEMO === '1' && process.env.VERCEL_ENV !== 'production') return 'demo'
  return 'pendente'
}

export function variaveisFaltando(): string[] {
  const faltando: string[] = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) faltando.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) faltando.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return faltando
}
