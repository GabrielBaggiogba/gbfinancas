'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { obterUsuario } from '@/features/auth/sessao'
import { ESQUEMAS, ESQUEMAS_PARCIAIS, primeiraMensagem } from './esquemas'
import { ErroDeBanco, obterBanco } from './servidor/banco'
import { TABELAS, type Dados, type Operacao, type Tabela } from './tipos'

export type Resultado = { ok: true } | { ok: false; mensagem: string }

const SESSAO = 'Sua sessão expirou. Entre de novo.'
const FALHA = 'Não foi possível salvar. Tente de novo.'

const tabela = z.enum(TABELAS as [Tabela, ...Tabela[]])
const registro = z.record(z.unknown())
const operacoesSchema = z
  .array(
    z.discriminatedUnion('op', [
      z.object({ op: z.literal('inserir'), tabela, linhas: z.array(registro).min(1).max(5000) }),
      z.object({ op: z.literal('atualizar'), tabela, id: z.string().uuid(), campos: registro }),
      z.object({
        op: z.literal('excluir'),
        tabela,
        ids: z.array(z.string().uuid()).min(1).max(5000),
      }),
    ]),
  )
  .min(1)
  .max(100)

/** Valida cada operação com o schema da tabela e devolve só os campos conhecidos. */
function validar(entrada: unknown): Operacao[] | string {
  const lote = operacoesSchema.safeParse(entrada)
  if (!lote.success) return 'Dados inválidos.'
  const limpas: Operacao[] = []
  for (const o of lote.data) {
    if (o.op === 'inserir') {
      const linhas: Record<string, unknown>[] = []
      for (const linha of o.linhas) {
        const r = ESQUEMAS[o.tabela].safeParse(linha)
        if (!r.success) return primeiraMensagem(r.error)
        linhas.push(r.data)
      }
      limpas.push({ op: 'inserir', tabela: o.tabela, linhas })
    } else if (o.op === 'atualizar') {
      const r = ESQUEMAS_PARCIAIS[o.tabela].safeParse(o.campos)
      if (!r.success) return primeiraMensagem(r.error)
      const campos: Record<string, unknown> = { ...r.data }
      delete campos.id
      delete campos.created_at
      if (Object.keys(campos).length === 0) continue
      limpas.push({ op: 'atualizar', tabela: o.tabela, id: o.id, campos })
    } else {
      limpas.push(o)
    }
  }
  return limpas
}

export async function gravar(entrada: unknown): Promise<Resultado> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  const operacoes = validar(entrada)
  if (typeof operacoes === 'string') return { ok: false, mensagem: operacoes }
  if (operacoes.length === 0) return { ok: true }
  try {
    await obterBanco(usuario).aplicar(operacoes)
    return { ok: true }
  } catch (e) {
    return { ok: false, mensagem: e instanceof ErroDeBanco ? e.message : FALHA }
  }
}

const backupSchema = z.object({
  app: z.literal('gbfinancas'),
  versao: z.literal(1),
  dados: z.object({
    contas: z.array(ESQUEMAS.contas).max(500),
    cartoes: z.array(ESQUEMAS.cartoes).max(200),
    categorias: z.array(ESQUEMAS.categorias).max(1000),
    lancamentos: z.array(ESQUEMAS.lancamentos).max(50_000),
    orcamentos: z.array(ESQUEMAS.orcamentos).max(1000),
    metas: z.array(ESQUEMAS.metas).max(500),
    aportes: z.array(ESQUEMAS.aportes).max(20_000),
    recorrentes: z.array(ESQUEMAS.recorrentes).max(1000),
  }),
})

const REFERENCIAS = [
  'pai_id',
  'categoria_id',
  'conta_id',
  'conta_destino_id',
  'cartao_id',
  'recorrente_id',
  'meta_id',
  'grupo_id',
]

/** Restaura um backup: apaga os dados atuais e grava os do arquivo, com novos ids. */
export async function restaurarBackup(entrada: unknown): Promise<Resultado> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  const backup = backupSchema.safeParse(entrada)
  if (!backup.success)
    return { ok: false, mensagem: 'Este arquivo não é um backup válido do GBFinanças.' }

  // Ids novos, para o backup poder ser restaurado em qualquer conta.
  const mapa = new Map<string, string>()
  for (const t of TABELAS)
    for (const linha of backup.data.dados[t]) mapa.set(linha.id, randomUUID())
  const grupos = new Map<string, string>()
  const dados = {} as Record<Tabela, Record<string, unknown>[]>
  for (const t of TABELAS) {
    dados[t] = backup.data.dados[t].map((original) => {
      const linha: Record<string, unknown> = { ...original, id: mapa.get(original.id) }
      for (const campo of REFERENCIAS) {
        const valor = linha[campo]
        if (typeof valor !== 'string') continue
        if (campo === 'grupo_id') {
          if (!grupos.has(valor)) grupos.set(valor, randomUUID())
          linha[campo] = grupos.get(valor)
        } else {
          linha[campo] = mapa.get(valor) ?? null
        }
      }
      return linha
    })
  }
  dados.aportes = dados.aportes.filter((a) => a.meta_id !== null)
  dados.lancamentos = dados.lancamentos.filter((l) => ESQUEMAS.lancamentos.safeParse(l).success)

  try {
    await obterBanco(usuario).substituir(dados as unknown as Dados)
    return { ok: true }
  } catch (e) {
    return { ok: false, mensagem: e instanceof ErroDeBanco ? e.message : FALHA }
  }
}

/** Apaga todos os dados financeiros do usuário (a conta de acesso continua). */
export async function apagarTudo(): Promise<Resultado> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  try {
    const vazio = Object.fromEntries(TABELAS.map((t) => [t, []])) as unknown as Dados
    await obterBanco(usuario).substituir(vazio)
    return { ok: true }
  } catch (e) {
    return { ok: false, mensagem: e instanceof ErroDeBanco ? e.message : FALHA }
  }
}
