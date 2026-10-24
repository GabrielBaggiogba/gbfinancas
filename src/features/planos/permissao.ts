import 'server-only'
import type { Usuario } from '@/features/auth/sessao'
import { obterFamilia } from '@/features/familia/servidor'
import { adminAtivo, clienteAdmin } from '@/lib/supabase/admin'
import { cobrancaAtiva, limitesDe, PLANO_MINIMO, type Limites, type PlanoDoUsuario } from './planos'
import { obterAssinatura } from './servidor'

type Recurso = keyof typeof PLANO_MINIMO

/** Na família vale o plano de quem convidou; fora dela, o da própria pessoa. */
async function planoEfetivo(usuario: Usuario): Promise<PlanoDoUsuario> {
  const { donoId } = await obterFamilia(usuario)
  if (donoId === usuario.id || !adminAtivo()) return (await obterAssinatura(usuario)).plano
  const { data } = await clienteAdmin()
    .from('perfis')
    .select('plano')
    .eq('user_id', donoId)
    .maybeSingle()
  return (data?.plano ?? null) as PlanoDoUsuario
}

export async function limitesDoUsuario(usuario: Usuario): Promise<Limites> {
  if (!cobrancaAtiva()) return limitesDe(null, false)
  return limitesDe(await planoEfetivo(usuario), true)
}

/** Mensagem de bloqueio, ou null quando o plano libera o recurso. */
export async function bloqueio(usuario: Usuario, recurso: Recurso): Promise<string | null> {
  if (!cobrancaAtiva()) return null
  return (await limitesDoUsuario(usuario))[recurso] ? null : mensagemDeBloqueio(recurso)
}

export const mensagemDeBloqueio = (recurso: Recurso) =>
  `Disponível a partir do plano ${PLANO_MINIMO[recurso]}. Veja os planos em ${
    process.env.NEXT_PUBLIC_SITE_URL || 'https://gbfinancas.vercel.app'
  }/planos.`
