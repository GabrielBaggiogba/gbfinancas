import 'server-only'
import type { Usuario } from '@/features/auth/sessao'
import { categoriasIniciais, contaInicial } from '../padroes'
import type { Dados } from '../tipos'
import { obterBanco } from './banco'

/** Carrega tudo do usuário. No primeiro acesso, cria uma conta e as categorias prontas. */
export async function carregarDados(usuario: Usuario): Promise<Dados> {
  const banco = obterBanco(usuario)
  const dados = await banco.carregar()
  if (dados.contas.length > 0 || dados.categorias.length > 0) return dados

  const agora = new Date().toISOString()
  const contas = [contaInicial(agora)]
  const categorias = categoriasIniciais(agora)
  await banco.aplicar([
    { op: 'inserir', tabela: 'contas', linhas: contas },
    { op: 'inserir', tabela: 'categorias', linhas: categorias },
  ])
  return { ...dados, contas, categorias }
}
