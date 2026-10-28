'use server'

import { z } from 'zod'
import { obterUsuario } from '@/features/auth/sessao'
import { hojeEmSaoPaulo } from '@/lib/datas'
import { ErroDeIA, lerLancamentos, type Leitura } from './ler'
import { ErroDeTranscricao, TIPOS_DE_AUDIO, transcrever } from './transcrever'

const id = z.string().uuid()
const contextoSchema = z.object({
  categorias: z
    .array(
      z.object({
        id,
        nome: z.string().max(40),
        tipo: z.enum(['receita', 'despesa']),
        pai: id.nullable(),
      }),
    )
    .max(500),
  contas: z.array(z.object({ id, nome: z.string().max(60) })).max(200),
  cartoes: z.array(z.object({ id, nome: z.string().max(60) })).max(100),
})

const leituraSchema = z.object({
  texto: z.string().max(2000),
  // ~4 MB de arquivo em base64
  anexo: z
    .object({
      tipo: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
      base64: z.string().max(5_600_000),
    })
    .nullable(),
  contexto: contextoSchema,
})

type Resultado<T> = ({ ok: true } & T) | { ok: false; mensagem: string }

/** Lê texto, voz transcrita, foto ou PDF e devolve rascunhos para a pessoa conferir. */
export async function lerComIA(dados: unknown): Promise<Resultado<Leitura>> {
  if (!(await obterUsuario())) return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' }
  const r = leituraSchema.safeParse(dados)
  if (!r.success) return { ok: false, mensagem: 'Arquivo grande demais ou dados inválidos.' }
  if (!r.data.texto.trim() && !r.data.anexo)
    return { ok: false, mensagem: 'Escreva, fale ou envie uma foto ou PDF.' }
  try {
    const leitura = await lerLancamentos(
      { hoje: hojeEmSaoPaulo(), ...r.data.contexto },
      r.data.texto,
      r.data.anexo ?? undefined,
    )
    return { ok: true, ...leitura }
  } catch (e) {
    return { ok: false, mensagem: e instanceof ErroDeIA ? e.message : 'A leitura com IA falhou.' }
  }
}

const sugestaoSchema = z.object({
  descricao: z.string().trim().min(2).max(120),
  tipo: z.enum(['receita', 'despesa']),
  contexto: contextoSchema,
})

/** Categoria para uma descrição digitada no editor. */
export async function sugerirCategoria(
  dados: unknown,
): Promise<Resultado<{ categoria_id: string | null }>> {
  if (!(await obterUsuario())) return { ok: false, mensagem: 'Sessão expirada.' }
  const r = sugestaoSchema.safeParse(dados)
  if (!r.success) return { ok: false, mensagem: 'Dados inválidos.' }
  try {
    const verbo = r.data.tipo === 'receita' ? 'Recebi' : 'Gastei'
    const leitura = await lerLancamentos(
      { hoje: hojeEmSaoPaulo(), ...r.data.contexto },
      `${verbo} 10 reais com: ${r.data.descricao}. (Só preciso da categoria.)`,
    )
    return { ok: true, categoria_id: leitura.itens[0]?.categoria_id ?? null }
  } catch (e) {
    return { ok: false, mensagem: e instanceof ErroDeIA ? e.message : 'Falhou.' }
  }
}

const audioSchema = z.object({
  tipo: z.string().max(60),
  base64: z.string().min(1).max(5_600_000),
})

/** Transcreve um áudio gravado no app; o texto volta para a pessoa conferir antes de interpretar. */
export async function ouvirAudio(dados: unknown): Promise<Resultado<{ texto: string }>> {
  if (!(await obterUsuario())) return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' }
  const r = audioSchema.safeParse(dados)
  const tipo = TIPOS_DE_AUDIO.find((t) => t === r.data?.tipo.split(';')[0])
  if (!r.success || !tipo)
    return { ok: false, mensagem: 'Áudio grande demais ou em formato inválido.' }
  try {
    return { ok: true, texto: await transcrever({ tipo, base64: r.data.base64 }) }
  } catch (e) {
    return {
      ok: false,
      mensagem: e instanceof ErroDeTranscricao ? e.message : 'Não consegui ouvir o áudio.',
    }
  }
}
