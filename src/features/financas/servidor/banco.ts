import 'server-only'
import { obterModo } from '@/lib/modo'
import type { Dados, Operacao } from '../tipos'
import { bancoDemo } from './banco-demo'
import { bancoSupabase } from './banco-supabase'

/** Acesso aos dados do usuário logado. As regras financeiras ficam em `calculos.ts`. */
export interface Banco {
  carregar(): Promise<Dados>
  /** Aplica as operações na ordem. Lança `ErroDeBanco` com mensagem para a pessoa. */
  aplicar(operacoes: Operacao[]): Promise<void>
  /** Apaga tudo do usuário e grava os dados informados (restauração de backup). */
  substituir(dados: Dados): Promise<void>
}

export class ErroDeBanco extends Error {}

export function obterBanco(usuario: { id: string; email: string }): Banco {
  const modo = obterModo()
  if (modo === 'supabase') return bancoSupabase()
  if (modo === 'demo') return bancoDemo(usuario.email)
  throw new Error('Supabase não configurado.')
}
