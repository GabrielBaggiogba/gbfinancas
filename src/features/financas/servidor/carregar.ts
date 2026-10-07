import 'server-only'
import type { Usuario } from '@/features/auth/sessao'
import { categoriasIniciais, contaInicial } from '../padroes'
import type { Dados } from '../tipos'
import { obterBanco } from './banco'

/** Carrega tudo do usuário. Quem ainda não tem conta ou categorias recebe as prontas. */
export async function carregarDados(usuario: Usuario): Promise<Dados> {
  const banco = obterBanco(usuario)
  const dados = await banco.carregar()
  const faltamContas = dados.contas.length === 0
  const faltamCategorias = dados.categorias.length === 0
  if (!faltamContas && !faltamCategorias) return dados

  const agora = new Date().toISOString()
  const contas = faltamContas ? [contaInicial(agora)] : dados.contas
  const categorias = faltamCategorias ? categoriasIniciais(agora) : dados.categorias
  await banco.aplicar([
    ...(faltamContas
      ? [{ op: 'inserir' as const, tabela: 'contas' as const, linhas: contas }]
      : []),
    ...(faltamCategorias
      ? [{ op: 'inserir' as const, tabela: 'categorias' as const, linhas: categorias }]
      : []),
  ])
  return { ...dados, contas, categorias }
}
