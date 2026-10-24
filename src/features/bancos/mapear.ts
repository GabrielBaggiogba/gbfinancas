// Tradução do que o banco manda (Pluggy / Open Finance) para o modelo do GBFinanças.
// Funções puras, testadas em mapear.test.ts.

import type { Lancamento } from '@/features/financas/tipos'
import { hojeEmSaoPaulo, mesDe } from '@/lib/datas'

// Só os campos que usamos dos tipos do SDK da Pluggy.
export type ContaDoBanco = {
  id: string
  type: 'BANK' | 'CREDIT' | string
  subtype: string
  name: string
  marketingName: string | null
  number: string
  balance: number
  creditLimit?: number | null
  balanceCloseDate?: Date | string | null
  balanceDueDate?: Date | string | null
  creditData?: {
    creditLimit?: number | null
    balanceCloseDate?: Date | string | null
    balanceDueDate?: Date | string | null
  } | null
}

export type TransacaoDoBanco = {
  id: string
  date: Date | string
  description: string
  type: 'DEBIT' | 'CREDIT' | string
  amount: number
  amountInAccountCurrency: number | null
  category: string | null
  status?: string
  creditCardMetadata?: { installmentNumber?: number; totalInstallments?: number } | null
}

export type CategoriaSimples = { id: string; nome: string; tipo: 'receita' | 'despesa' }

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Palavras da categoria do banco (em inglês ou português) -> nome da categoria padrão do app.
const MAPA: { palavras: RegExp; despesa?: string; receita?: string }[] = [
  { palavras: /salar|payroll|wage|proventos/, receita: 'Salário' },
  {
    palavras: /invest|dividend|interest|rendiment|juros/,
    receita: 'Investimentos',
    despesa: 'Outros gastos',
  },
  {
    palavras: /grocer|supermarket|mercado|aliment|food|eating|restaurant|delivery|padaria|bakery/,
    despesa: 'Alimentação',
  },
  {
    palavras: /housing|rent|aluguel|utilit|electric|energia|water|agua|gas\b|condomin|moradia/,
    despesa: 'Moradia',
  },
  {
    palavras:
      /transport|fuel|combust|gas station|uber|taxi|parking|estacion|vehicle|veicul|toll|pedagio|transit/,
    despesa: 'Transporte',
  },
  {
    palavras: /health|saude|pharm|farmac|medic|hospital|dent|gym|academia|wellness/,
    despesa: 'Saúde',
  },
  { palavras: /educa|school|escola|course|curso|book|livr/, despesa: 'Estudos' },
  {
    palavras: /subscri|assinatura|stream|digital service|telecom|internet|phone|celular/,
    despesa: 'Assinaturas',
  },
  {
    palavras: /leisure|lazer|entertain|travel|viag|hotel|airline|cinema|games|hobb/,
    despesa: 'Lazer',
  },
  {
    palavras: /shopping|compras|cloth|roupa|electronic|eletron|online|department|retail/,
    despesa: 'Compras',
  },
]

/** Categoria do app para a categoria que o banco deu. Sem correspondência, null. */
export function categoriaPara(
  categoriaDoBanco: string | null,
  tipo: 'receita' | 'despesa',
  categorias: CategoriaSimples[],
): string | null {
  if (!categoriaDoBanco) return null
  const alvo = sem(categoriaDoBanco)
  const regra = MAPA.find((m) => m.palavras.test(alvo) && m[tipo])
  const nome = regra?.[tipo]
  if (!nome) return null
  return categorias.find((c) => c.tipo === tipo && sem(c.nome) === sem(nome))?.id ?? null
}

const dia = (d: Date | string | null | undefined, padrao: number) => {
  if (!d) return padrao
  const n = new Date(d).getUTCDate()
  return Number.isFinite(n) ? Math.min(28, Math.max(1, n)) : padrao
}

/** Data do lançamento no fuso de São Paulo. */
export const dataDaTransacao = (d: Date | string) => hojeEmSaoPaulo(new Date(d))

export const ehCartao = (c: ContaDoBanco) => c.type === 'CREDIT'

export function nomeDaConta(c: ContaDoBanco, instituicao: string): string {
  const base = c.marketingName || c.name || 'Conta'
  const final = c.number ? ` ${String(c.number).slice(-4)}` : ''
  return `${instituicao} · ${base}${final}`.slice(0, 60)
}

export function dadosDoCartao(c: ContaDoBanco) {
  const limite = c.creditData?.creditLimit ?? c.creditLimit ?? 0
  return {
    limite: Math.max(0, Math.round(Number(limite) * 100)),
    dia_fechamento: dia(c.creditData?.balanceCloseDate ?? c.balanceCloseDate, 1),
    dia_vencimento: dia(c.creditData?.balanceDueDate ?? c.balanceDueDate, 10),
  }
}

export type Destino = { tipo: 'conta' | 'cartao'; id: string }

/**
 * Lançamento do app para uma transação do banco, ou null quando não deve entrar:
 * pendente, valor zero, ou crédito no cartão (pagamento de fatura e estornos já
 * aparecem pelo lado da conta).
 */
export function lancamentoPara(
  t: TransacaoDoBanco,
  destino: Destino,
  categorias: CategoriaSimples[],
  cartaoDaFatura: string | null,
): Omit<Lancamento, 'id' | 'created_at'> | null {
  if (t.status === 'PENDING') return null
  const valor = Math.round(Math.abs(t.amountInAccountCurrency ?? t.amount) * 100)
  if (!valor) return null
  const data = dataDaTransacao(t.date)
  const descricao = (t.description || '').replace(/\s+/g, ' ').trim().slice(0, 120)
  const base = {
    valor,
    data,
    descricao,
    conta_destino_id: null,
    observacao: '',
    grupo_id: null,
    recorrente_id: null,
    fatura_ref: null,
    parcela_atual: null,
    parcela_total: null,
  }

  if (destino.tipo === 'cartao') {
    if (t.type !== 'DEBIT') return null
    const total = t.creditCardMetadata?.totalInstallments ?? 0
    const atual = t.creditCardMetadata?.installmentNumber ?? 0
    const parcelado = total > 1 && atual >= 1 && atual <= total && total <= 60
    return {
      ...base,
      tipo: 'despesa',
      categoria_id: categoriaPara(t.category, 'despesa', categorias),
      conta_id: null,
      cartao_id: destino.id,
      forma_pagamento: 'credito',
      parcela_atual: parcelado ? atual : null,
      parcela_total: parcelado ? total : null,
    }
  }

  const entrada = t.type === 'CREDIT'
  // Pagamento de fatura que sai da conta: vira "pagamento de fatura", não gasto.
  if (
    !entrada &&
    cartaoDaFatura &&
    /credit card payment|pagamento.*(fatura|cart)/i.test(`${t.category} ${descricao}`)
  )
    return {
      ...base,
      tipo: 'pagamento_fatura',
      categoria_id: null,
      conta_id: destino.id,
      cartao_id: cartaoDaFatura,
      forma_pagamento: null,
      fatura_ref: mesDe(data),
    }
  const tipo = entrada ? 'receita' : 'despesa'
  return {
    ...base,
    tipo,
    categoria_id: categoriaPara(t.category, tipo, categorias),
    conta_id: destino.id,
    cartao_id: null,
    forma_pagamento: /pix/i.test(`${t.category} ${descricao}`) ? 'pix' : null,
  }
}
