'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { z } from 'zod'
import { obterUsuario } from '@/features/auth/sessao'
import { obterFamilia } from '@/features/familia/servidor'
import { clienteAdmin } from '@/lib/supabase/admin'
import { clientePluggy, pluggyAtivo, urlDoWebhook } from './pluggy'
import { sincronizarConexao, statusDaConexao } from './sincronizar'

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; mensagem: string }
const SESSAO = 'Sua sessão expirou. Entre de novo.'
const DESLIGADO = 'A conexão com bancos não está configurada.'
const itemSchema = z.string().uuid()

/** Token de 30 minutos para abrir a janela de conexão da Pluggy (ou reconectar um banco). */
export async function criarTokenDeConexao(itemId?: unknown): Promise<Resultado<{ token: string }>> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  if (!pluggyAtivo()) return { ok: false, mensagem: DESLIGADO }
  let item: string | undefined
  if (itemId !== undefined) {
    const r = itemSchema.safeParse(itemId)
    if (!r.success || !(await conexaoDaFamilia(usuario, r.data)))
      return { ok: false, mensagem: 'Conexão não encontrada.' }
    item = r.data
  }
  try {
    const origem = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const { accessToken } = await clientePluggy().createConnectToken(item, {
      clientUserId: usuario.id,
      webhookUrl: urlDoWebhook(origem),
      avoidDuplicates: true,
    })
    return { ok: true, token: accessToken }
  } catch (e) {
    console.error('[bancos] token', e instanceof Error ? e.message : e)
    return { ok: false, mensagem: 'Não foi possível abrir a conexão agora. Tente de novo.' }
  }
}

/** Guarda o banco que a pessoa acabou de autorizar e começa a importar. */
export async function registrarConexao(itemId: unknown): Promise<Resultado> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  if (!pluggyAtivo()) return { ok: false, mensagem: DESLIGADO }
  const r = itemSchema.safeParse(itemId)
  if (!r.success) return { ok: false, mensagem: 'Conexão inválida.' }
  try {
    const item = await clientePluggy().fetchItem(r.data)
    // Só aceita a conexão criada por esta pessoa (o token leva o id dela).
    if (item.clientUserId !== usuario.id) return { ok: false, mensagem: 'Conexão inválida.' }
    const { donoId } = await obterFamilia(usuario)
    const { error } = await clienteAdmin()
      .from('conexoes_bancarias')
      .upsert(
        {
          item_id: item.id,
          user_id: donoId,
          criado_por: usuario.id,
          instituicao: item.connector?.name ?? '',
          logo: item.connector?.imageUrl ?? null,
          status: statusDaConexao(item),
        },
        { onConflict: 'item_id' },
      )
    if (error) throw new Error(error.message)
  } catch (e) {
    console.error('[bancos] registrar', e instanceof Error ? e.message : e)
    return { ok: false, mensagem: 'Não foi possível salvar a conexão. Tente de novo.' }
  }
  // A primeira importação pode demorar: segue depois da resposta (e de novo pelo webhook).
  after(() => sincronizarConexao(r.data).catch((e) => console.error('[bancos] 1ª sync', e)))
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function atualizarConexao(itemId: unknown): Promise<Resultado<{ novos: number }>> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  if (!pluggyAtivo()) return { ok: false, mensagem: DESLIGADO }
  const r = itemSchema.safeParse(itemId)
  if (!r.success || !(await conexaoDaFamilia(usuario, r.data)))
    return { ok: false, mensagem: 'Conexão não encontrada.' }
  try {
    const resultado = await sincronizarConexao(r.data)
    revalidatePath('/', 'layout')
    return { ok: true, novos: resultado?.novos ?? 0 }
  } catch (e) {
    console.error('[bancos] atualizar', e instanceof Error ? e.message : e)
    return { ok: false, mensagem: 'O banco não respondeu agora. Tente de novo mais tarde.' }
  }
}

/** Revoga o acesso ao banco. Contas e lançamentos já importados continuam no app. */
export async function desconectar(itemId: unknown): Promise<Resultado> {
  const usuario = await obterUsuario()
  if (!usuario) return { ok: false, mensagem: SESSAO }
  if (!pluggyAtivo()) return { ok: false, mensagem: DESLIGADO }
  const r = itemSchema.safeParse(itemId)
  if (!r.success || !(await conexaoDaFamilia(usuario, r.data)))
    return { ok: false, mensagem: 'Conexão não encontrada.' }
  try {
    await clientePluggy()
      .deleteItem(r.data)
      .catch(() => undefined) // já removida na Pluggy: segue e limpa daqui
    await clienteAdmin().from('conexoes_bancarias').delete().eq('item_id', r.data)
  } catch (e) {
    console.error('[bancos] desconectar', e instanceof Error ? e.message : e)
    return { ok: false, mensagem: 'Não foi possível desconectar. Tente de novo.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** A conexão pertence às finanças que a pessoa usa (dela ou da família)? */
async function conexaoDaFamilia(usuario: { id: string; email: string }, itemId: string) {
  const { donoId } = await obterFamilia(usuario)
  const { data } = await clienteAdmin()
    .from('conexoes_bancarias')
    .select('id')
    .eq('item_id', itemId)
    .eq('user_id', donoId)
    .maybeSingle()
  return Boolean(data)
}
