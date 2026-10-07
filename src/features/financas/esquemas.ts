import { z } from 'zod'
import { dataValida } from '@/lib/datas'
import { MAX_CENTAVOS } from '@/lib/dinheiro'
import type { Tabela } from './tipos'

// Um schema por tabela. O mesmo arquivo valida no navegador (formulários) e no
// servidor (Server Actions).

const id = z.string().uuid()
const idOpcional = id.nullable()
const data = z.string().refine(dataValida, 'Data inválida.')
const centavos = z.number().int().min(1, 'Informe um valor maior que zero.').max(MAX_CENTAVOS)
const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const criado = z.string().optional()

export const contaSchema = z.object({
  id,
  nome: z.string().trim().min(1, 'Dê um nome à conta.').max(60),
  tipo: z.enum(['corrente', 'dinheiro', 'poupanca', 'carteira', 'investimento']),
  saldo_inicial: z.number().int().min(-MAX_CENTAVOS).max(MAX_CENTAVOS),
  arquivada: z.boolean(),
  created_at: criado,
})

export const cartaoSchema = z.object({
  id,
  nome: z.string().trim().min(1, 'Dê um nome ao cartão.').max(60),
  limite: z.number().int().min(0).max(MAX_CENTAVOS),
  dia_fechamento: z.number().int().min(1).max(28, 'Use um dia entre 1 e 28.'),
  dia_vencimento: z.number().int().min(1).max(28, 'Use um dia entre 1 e 28.'),
  arquivado: z.boolean(),
  created_at: criado,
})

export const categoriaSchema = z.object({
  id,
  nome: z.string().trim().min(1, 'Dê um nome à categoria.').max(40),
  tipo: z.enum(['receita', 'despesa']),
  icone: z.string().min(1).max(30),
  cor,
  pai_id: idOpcional,
  created_at: criado,
})

const lancamentoBase = z.object({
  id,
  tipo: z.enum(['receita', 'despesa', 'transferencia', 'pagamento_fatura']),
  valor: centavos,
  data,
  descricao: z.string().trim().max(120),
  categoria_id: idOpcional,
  conta_id: idOpcional,
  conta_destino_id: idOpcional,
  cartao_id: idOpcional,
  forma_pagamento: z
    .enum(['dinheiro', 'pix', 'debito', 'credito', 'boleto', 'transferencia'])
    .nullable(),
  observacao: z.string().trim().max(500),
  parcela_atual: z.number().int().min(1).max(60).nullable(),
  parcela_total: z.number().int().min(1).max(60).nullable(),
  grupo_id: idOpcional,
  recorrente_id: idOpcional,
  fatura_ref: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullable(),
  created_at: criado,
})

export const lancamentoSchema = lancamentoBase.superRefine((l, ctx) => {
  const erro = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message })
  if (l.tipo === 'receita' && (!l.conta_id || l.cartao_id || l.conta_destino_id))
    erro('Escolha a conta que recebe a entrada.')
  if (l.tipo === 'despesa' && (l.conta_destino_id || !!l.conta_id === !!l.cartao_id))
    erro('Escolha a conta ou o cartão da saída.')
  if (
    l.tipo === 'transferencia' &&
    (!l.conta_id || !l.conta_destino_id || l.conta_id === l.conta_destino_id || l.cartao_id)
  )
    erro('Escolha duas contas diferentes para a transferência.')
  if (l.tipo === 'pagamento_fatura' && (!l.conta_id || !l.cartao_id || !l.fatura_ref))
    erro('Escolha a conta que paga a fatura.')
  if ((l.parcela_atual === null) !== (l.parcela_total === null)) erro('Parcelas inválidas.')
})

export const orcamentoSchema = z.object({
  id,
  categoria_id: idOpcional,
  valor: centavos,
  created_at: criado,
})

export const metaSchema = z.object({
  id,
  nome: z.string().trim().min(1, 'Dê um nome à meta.').max(60),
  valor_alvo: centavos,
  prazo: data.nullable(),
  icone: z.string().min(1).max(30),
  cor,
  created_at: criado,
})

export const aporteSchema = z.object({
  id,
  meta_id: id,
  valor: z
    .number()
    .int()
    .min(-MAX_CENTAVOS)
    .max(MAX_CENTAVOS)
    .refine((v) => v !== 0, 'Informe um valor.'),
  data,
  observacao: z.string().trim().max(200),
  created_at: criado,
})

export const recorrenteSchema = z.object({
  id,
  tipo: z.enum(['receita', 'despesa']),
  descricao: z.string().trim().min(1, 'Descreva o lançamento.').max(120),
  valor: centavos,
  categoria_id: idOpcional,
  conta_id: idOpcional,
  cartao_id: idOpcional,
  frequencia: z.enum(['semanal', 'mensal', 'anual']),
  proximo_vencimento: data,
  ativo: z.boolean(),
  created_at: criado,
})

export const ESQUEMAS = {
  contas: contaSchema,
  cartoes: cartaoSchema,
  categorias: categoriaSchema,
  lancamentos: lancamentoSchema,
  orcamentos: orcamentoSchema,
  metas: metaSchema,
  aportes: aporteSchema,
  recorrentes: recorrenteSchema,
} satisfies Record<Tabela, z.ZodTypeAny>

/** Schemas sem os refinamentos, para validar atualizações parciais. */
export const ESQUEMAS_PARCIAIS = {
  contas: contaSchema.partial(),
  cartoes: cartaoSchema.partial(),
  categorias: categoriaSchema.partial(),
  lancamentos: lancamentoBase.partial(),
  orcamentos: orcamentoSchema.partial(),
  metas: metaSchema.partial(),
  aportes: aporteSchema.partial(),
  recorrentes: recorrenteSchema.partial(),
} satisfies Record<Tabela, z.ZodTypeAny>

export function primeiraMensagem(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? 'Dados inválidos.'
}
