import type { Categoria, Conta, FormaPagamento, Frequencia, TipoConta } from './tipos'

/** Paleta fixa das categorias e dos gráficos (ordem validada para daltonismo). */
export const CORES = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
] as const

export const COR_NEUTRA = '#7d8693'

type Modelo = { nome: string; tipo: 'receita' | 'despesa'; icone: string; cor: string }

export const CATEGORIAS_PADRAO: Modelo[] = [
  { nome: 'Alimentação', tipo: 'despesa', icone: 'utensils', cor: CORES[1] },
  { nome: 'Moradia', tipo: 'despesa', icone: 'home', cor: CORES[0] },
  { nome: 'Transporte', tipo: 'despesa', icone: 'car', cor: CORES[2] },
  { nome: 'Lazer', tipo: 'despesa', icone: 'gamepad', cor: CORES[4] },
  { nome: 'Saúde', tipo: 'despesa', icone: 'heart', cor: CORES[7] },
  { nome: 'Estudos', tipo: 'despesa', icone: 'book', cor: CORES[6] },
  { nome: 'Compras', tipo: 'despesa', icone: 'bag', cor: CORES[3] },
  { nome: 'Assinaturas', tipo: 'despesa', icone: 'repeat', cor: CORES[5] },
  { nome: 'Outros gastos', tipo: 'despesa', icone: 'tag', cor: COR_NEUTRA },
  { nome: 'Salário', tipo: 'receita', icone: 'briefcase', cor: CORES[0] },
  { nome: 'Freelance', tipo: 'receita', icone: 'laptop', cor: CORES[2] },
  { nome: 'Investimentos', tipo: 'receita', icone: 'trending', cor: CORES[6] },
  { nome: 'Outras entradas', tipo: 'receita', icone: 'plus', cor: COR_NEUTRA },
]

export function novoId(): string {
  return crypto.randomUUID()
}

export function categoriasIniciais(agora: string): Categoria[] {
  return CATEGORIAS_PADRAO.map((c) => ({ ...c, id: novoId(), pai_id: null, created_at: agora }))
}

export function contaInicial(agora: string): Conta {
  return {
    id: novoId(),
    nome: 'Carteira',
    tipo: 'dinheiro',
    saldo_inicial: 0,
    arquivada: false,
    created_at: agora,
  }
}

export const ROTULO_CONTA: Record<TipoConta, string> = {
  corrente: 'Conta corrente',
  dinheiro: 'Dinheiro',
  poupanca: 'Poupança',
  carteira: 'Carteira digital',
  investimento: 'Investimento',
}

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
}

export const ROTULO_FREQUENCIA: Record<Frequencia, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
  anual: 'Anual',
}
