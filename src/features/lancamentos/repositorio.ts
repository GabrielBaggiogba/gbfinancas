import 'server-only'
import { obterModo } from '@/lib/modo'
import { repositorioDemo } from './repositorio-demo'
import { repositorioSupabase } from './repositorio-supabase'
import type { Lancamento } from './tipos'

export interface RepositorioLancamentos {
  listarPeriodo(inicio: string, fim: string): Promise<Lancamento[]>
  salvar(usuarioId: string, l: Lancamento): Promise<Lancamento>
}

export function obterRepositorio(): RepositorioLancamentos {
  const modo = obterModo()
  if (modo === 'supabase') return repositorioSupabase()
  if (modo === 'demo') return repositorioDemo()
  throw new Error('Supabase não configurado.')
}
