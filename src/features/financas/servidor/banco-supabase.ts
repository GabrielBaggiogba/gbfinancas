import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/server'
import {
  CAMPOS_DINHEIRO,
  DADOS_VAZIOS,
  TABELAS,
  type Dados,
  type Operacao,
  type Tabela,
} from '../tipos'
import { ErroDeBanco, type Banco } from './banco'

type Registro = Record<string, unknown>

// O banco guarda reais com duas casas; o app trabalha em centavos inteiros.
function paraApp(tabela: Tabela, linha: Registro): Registro {
  const saida: Registro = { ...linha }
  delete saida.user_id
  delete saida.updated_at
  for (const campo of CAMPOS_DINHEIRO[tabela])
    if (saida[campo] != null) saida[campo] = Math.round(Number(saida[campo]) * 100)
  return saida
}

function paraBanco(tabela: Tabela, linha: Registro): Registro {
  const saida: Registro = { ...linha }
  delete saida.created_at
  delete saida.user_id
  for (const campo of CAMPOS_DINHEIRO[tabela])
    if (typeof saida[campo] === 'number') saida[campo] = (saida[campo] as number) / 100
  return saida
}

function traduzir(erro: { code?: string; message?: string }): string {
  if (erro.code === '23503')
    return 'Este item ainda tem lançamentos ligados a ele. Arquive ou mova os lançamentos antes de excluir.'
  if (erro.code === '23505') return 'Já existe um item igual a este.'
  if (erro.code === '23514') return 'Algum valor está fora do permitido.'
  // Limite de gravações por minuto (trigger `limite` no banco).
  if (erro.code === 'GB429') return 'Muitas alterações em pouco tempo. Aguarde um minuto.'
  return 'Não foi possível salvar. Tente de novo.'
}

const PAGINA = 1000
const MAXIMO = 50_000

export function bancoSupabase(): Banco {
  // O cliente tipado não combina com nomes de tabela dinâmicos; o formato das linhas
  // é garantido pelos schemas Zod antes de chegar aqui.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente: Promise<any> = criarClienteServidor()

  async function lerTudo(tabela: Tabela): Promise<Registro[]> {
    const linhas: Registro[] = []
    const supabase = await cliente
    for (let inicio = 0; inicio < MAXIMO; inicio += PAGINA) {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(inicio, inicio + PAGINA - 1)
      if (error) throw new Error(`Falha ao ler ${tabela}: ${error.message}`)
      linhas.push(...(data as Registro[]))
      if (data.length < PAGINA) break
    }
    return linhas.map((l) => paraApp(tabela, l))
  }

  async function inserir(tabela: Tabela, linhas: Registro[]): Promise<void> {
    // Subcategorias em um comando separado, depois das categorias-mãe: a policy do banco
    // confere se a mãe existe, e não enxerga linhas do mesmo comando.
    if (tabela === 'categorias' && linhas.some((l) => l.pai_id) && linhas.some((l) => !l.pai_id)) {
      await inserir(
        tabela,
        linhas.filter((l) => !l.pai_id),
      )
      return inserir(
        tabela,
        linhas.filter((l) => l.pai_id),
      )
    }
    const supabase = await cliente
    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500).map((l) => paraBanco(tabela, l))
      const { error } = await supabase.from(tabela).insert(lote)
      if (error) throw new ErroDeBanco(traduzir(error))
    }
  }

  return {
    async carregar() {
      const listas = await Promise.all(TABELAS.map((t) => lerTudo(t)))
      const dados = { ...DADOS_VAZIOS } as Record<Tabela, unknown[]>
      TABELAS.forEach((t, i) => (dados[t] = listas[i]))
      return dados as Dados
    },

    async aplicar(operacoes: Operacao[]) {
      const supabase = await cliente
      for (const o of operacoes) {
        if (o.op === 'inserir') {
          await inserir(o.tabela, o.linhas)
        } else if (o.op === 'atualizar') {
          const { error } = await supabase
            .from(o.tabela)
            .update(paraBanco(o.tabela, o.campos))
            .eq('id', o.id)
          if (error) throw new ErroDeBanco(traduzir(error))
        } else {
          const { error } = await supabase.from(o.tabela).delete().in('id', o.ids)
          if (error) throw new ErroDeBanco(traduzir(error))
        }
      }
    },

    async substituir(dados: Dados) {
      const supabase = await cliente
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new ErroDeBanco('Sua sessão expirou. Entre de novo.')
      for (const tabela of [...TABELAS].reverse()) {
        const { error } = await supabase.from(tabela).delete().eq('user_id', user.id)
        if (error) throw new ErroDeBanco(traduzir(error))
      }
      for (const tabela of TABELAS) {
        const linhas = dados[tabela] as Registro[]
        if (linhas.length) await inserir(tabela, linhas)
      }
    },
  }
}
