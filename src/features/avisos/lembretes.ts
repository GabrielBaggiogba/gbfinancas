import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enviarModelo, whatsappAtivo } from '@/features/whatsapp/api'
import { dataBR, diasEntre, hojeEmSaoPaulo, somarDias } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { clienteAdmin } from '@/lib/supabase/admin'
import { emailAtivo, enviarEmail } from './email'

type Perfil = {
  user_id: string
  telefone: string | null
  avisos_email: boolean
  avisos_whatsapp: boolean
  antecedencia_dias: number
}
type Conta = {
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa'
  proximo_vencimento: string
}

const quando = (dias: number) => (dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`)

/** Linha do aviso. `valor` vem do banco em reais. */
export function linhaDoAviso(c: Conta, hoje: string): string {
  const dias = diasEntre(hoje, c.proximo_vencimento)
  const verbo = c.tipo === 'receita' ? 'entra' : 'vence'
  return `${c.descricao} · ${formatarReais(Math.round(Number(c.valor) * 100))} · ${verbo} ${quando(dias)} (${dataBR(c.proximo_vencimento)})`
}

/** Lembretes do dia: contas recorrentes que vencem entre hoje e a antecedência escolhida. */
export async function enviarLembretes(): Promise<{
  pessoas: number
  emails: number
  whatsapps: number
}> {
  const admin = clienteAdmin()
  const hoje = hojeEmSaoPaulo()
  const porEmail = emailAtivo()
  const porWhats = whatsappAtivo() && Boolean(process.env.WHATSAPP_TEMPLATE_LEMBRETE)
  const total = { pessoas: 0, emails: 0, whatsapps: 0 }
  if (!porEmail && !porWhats) return total

  const perfis: Perfil[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await admin
      .from('perfis')
      .select('user_id, telefone, avisos_email, avisos_whatsapp, antecedencia_dias')
      .or('avisos_email.eq.true,avisos_whatsapp.eq.true')
      .range(de, de + 999)
    if (error) throw new Error(error.message)
    perfis.push(...(data as Perfil[]))
    if (data.length < 1000) break
  }
  const { data: membros } = await admin.from('membros').select('dono, membro')
  const donoDe = new Map((membros ?? []).map((m) => [m.membro as string, m.dono as string]))
  const emails = porEmail ? await todosOsEmails(admin) : new Map<string, string>()
  const contasDe = new Map<string, Conta[]>()

  for (const p of perfis) {
    const dono = donoDe.get(p.user_id) ?? p.user_id
    if (!contasDe.has(dono)) {
      const { data } = await admin
        .from('recorrentes')
        .select('descricao, valor, tipo, proximo_vencimento')
        .eq('user_id', dono)
        .eq('ativo', true)
        .gte('proximo_vencimento', hoje)
        .lte('proximo_vencimento', somarDias(hoje, 15))
        .order('proximo_vencimento')
      contasDe.set(dono, (data ?? []) as Conta[])
    }
    const limite = somarDias(hoje, p.antecedencia_dias)
    const contas = contasDe.get(dono)!.filter((c) => c.proximo_vencimento <= limite)
    if (!contas.length) continue
    total.pessoas++
    const linhas = contas.map((c) => linhaDoAviso(c, hoje))

    const email = emails.get(p.user_id)
    if (porEmail && p.avisos_email && email) {
      const assunto =
        contas.length === 1
          ? `Lembrete: ${contas[0].descricao}`
          : `Lembrete: ${contas.length} contas chegando`
      const texto = `Olá! Estas contas estão chegando:\n\n${linhas.map((l) => `• ${l}`).join('\n')}\n\nGBFinanças`
      const html = `<p>Olá! Estas contas estão chegando:</p><ul>${linhas
        .map((l) => `<li>${escapar(l)}</li>`)
        .join(
          '',
        )}</ul><p style="color:#45594c">GBFinanças · você pode desligar estes avisos em Configurações.</p>`
      if (await enviarEmail(email, assunto, texto, html)) total.emails++
    }
    if (porWhats && p.avisos_whatsapp && p.telefone) {
      if (await enviarModelo(p.telefone, linhas.join('; '))) total.whatsapps++
    }
  }
  return total
}

async function todosOsEmails(admin: SupabaseClient): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (error) throw new Error(error.message)
    for (const u of data.users) if (u.email) mapa.set(u.id, u.email)
    if (data.users.length < 1000) break
  }
  return mapa
}

const escapar = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
