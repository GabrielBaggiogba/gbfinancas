// Tipos do domínio. Todo valor monetário está em centavos inteiros.

export type TipoConta = 'corrente' | 'dinheiro' | 'poupanca' | 'carteira' | 'investimento'
export type TipoCategoria = 'receita' | 'despesa'
export type TipoLancamento = 'receita' | 'despesa' | 'transferencia' | 'pagamento_fatura'
export type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto' | 'transferencia'
export type Frequencia = 'semanal' | 'mensal' | 'anual'

export type Conta = {
  id: string
  nome: string
  tipo: TipoConta
  saldo_inicial: number
  arquivada: boolean
  created_at: string
}

export type Cartao = {
  id: string
  nome: string
  limite: number
  dia_fechamento: number
  dia_vencimento: number
  arquivado: boolean
  created_at: string
}

export type Categoria = {
  id: string
  nome: string
  tipo: TipoCategoria
  icone: string
  cor: string
  pai_id: string | null
  created_at: string
}

export type Lancamento = {
  id: string
  tipo: TipoLancamento
  valor: number
  data: string
  descricao: string
  categoria_id: string | null
  conta_id: string | null
  conta_destino_id: string | null
  cartao_id: string | null
  forma_pagamento: FormaPagamento | null
  observacao: string
  parcela_atual: number | null
  parcela_total: number | null
  grupo_id: string | null
  recorrente_id: string | null
  fatura_ref: string | null
  created_at: string
}

export type Orcamento = {
  id: string
  categoria_id: string | null
  valor: number
  created_at: string
}

export type Meta = {
  id: string
  nome: string
  valor_alvo: number
  prazo: string | null
  icone: string
  cor: string
  created_at: string
}

export type Aporte = {
  id: string
  meta_id: string
  valor: number
  data: string
  observacao: string
  created_at: string
}

export type Recorrente = {
  id: string
  tipo: TipoCategoria
  descricao: string
  valor: number
  categoria_id: string | null
  conta_id: string | null
  cartao_id: string | null
  frequencia: Frequencia
  proximo_vencimento: string
  ativo: boolean
  created_at: string
}

export type Dados = {
  contas: Conta[]
  cartoes: Cartao[]
  categorias: Categoria[]
  lancamentos: Lancamento[]
  orcamentos: Orcamento[]
  metas: Meta[]
  aportes: Aporte[]
  recorrentes: Recorrente[]
}

export type Tabela = keyof Dados
export type Linha<T extends Tabela> = Dados[T][number]

/** Ordem segura para inserir (pais antes dos filhos). A exclusão usa a ordem inversa. */
export const TABELAS: Tabela[] = [
  'contas',
  'cartoes',
  'categorias',
  'recorrentes',
  'lancamentos',
  'orcamentos',
  'metas',
  'aportes',
]

/** Colunas monetárias de cada tabela (numeric no banco, centavos no app). */
export const CAMPOS_DINHEIRO: Record<Tabela, string[]> = {
  contas: ['saldo_inicial'],
  cartoes: ['limite'],
  categorias: [],
  recorrentes: ['valor'],
  lancamentos: ['valor'],
  orcamentos: ['valor'],
  metas: ['valor_alvo'],
  aportes: ['valor'],
}

export const DADOS_VAZIOS: Dados = {
  contas: [],
  cartoes: [],
  categorias: [],
  lancamentos: [],
  orcamentos: [],
  metas: [],
  aportes: [],
  recorrentes: [],
}

/** Uma alteração nos dados. O cliente aplica na hora e manda o mesmo lote ao servidor. */
export type Operacao =
  | { op: 'inserir'; tabela: Tabela; linhas: Record<string, unknown>[] }
  | { op: 'atualizar'; tabela: Tabela; id: string; campos: Record<string, unknown> }
  | { op: 'excluir'; tabela: Tabela; ids: string[] }
