import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ESQUEMAS } from '@/features/financas/esquemas'
import { lancamentoVazio, parcelar } from '@/features/financas/fabrica'
import { ErroDeIA, iaAtiva, lerLancamentos, type Anexo, type Contexto } from '@/features/ia/ler'
import { cobrancaAtiva, limitesDe, type PlanoDoUsuario } from '@/features/planos/planos'
import { mensagemDeBloqueio } from '@/features/planos/permissao'
import { dataBR, fimDoMes, hojeEmSaoPaulo, inicioDoMes, mesDe, rotuloMes } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { clienteAdmin } from '@/lib/supabase/admin'
import { baixarMidia, enviarTexto } from './api'

// O que chega no webhook: só os campos que usamos.
export type MensagemRecebida = {
  id: string
  from: string
  type: string
  text?: { body?: string }
  image?: { id: string; mime_type?: string; caption?: string }
  document?: { id: string; mime_type?: string; caption?: string }
}

const AJUDA = `Oi! Eu registro seus gastos e entradas no GBFinanças.

• Escreva: _almoço 32 no pix_ ou _recebi 1500 de salário_
• Mande a foto da nota ou o PDF de um boleto
• Responda *desfazer* para apagar o último registro`

/** Processa uma mensagem do WhatsApp: vínculo do número, lançamento ou comando. */
export async function processarMensagem(m: MensagemRecebida): Promise<void> {
  const admin = clienteAdmin()
  // A Meta pode reenviar a mesma mensagem: só a primeira passa.
  const { error: repetida } = await admin.from('whatsapp_mensagens').insert({ id: m.id })
  if (repetida) return

  const texto = (m.text?.body ?? m.image?.caption ?? m.document?.caption ?? '').trim()
  const codigo = /^gb\s*(\d{6})$/i.exec(texto)
  if (codigo) return vincular(admin, m.from, codigo[1])

  const { data: perfil } = await admin
    .from('perfis')
    .select('user_id, whatsapp_ultimos, whatsapp_ultimos_em')
    .eq('telefone', m.from)
    .maybeSingle()
  if (!perfil) {
    await enviarTexto(
      m.from,
      'Olá! Para usar o GBFinanças por aqui, abra o app em Configurações › WhatsApp e siga o passo para vincular este número.',
    )
    return
  }
  const usuario = perfil.user_id as string
  const { data: membro } = await admin
    .from('membros')
    .select('dono')
    .eq('membro', usuario)
    .maybeSingle()
  const dono = (membro?.dono as string | undefined) ?? usuario

  // Com a cobrança ligada, o WhatsApp é do plano Completo em diante (vale o plano do dono).
  if (cobrancaAtiva()) {
    const { data: p } = await admin.from('perfis').select('plano').eq('user_id', dono).maybeSingle()
    if (!limitesDe((p?.plano ?? null) as PlanoDoUsuario, true).whatsapp) {
      await enviarTexto(m.from, mensagemDeBloqueio('whatsapp'))
      return
    }
  }

  if (/^(desfazer|apagar|cancelar)$/i.test(texto))
    return desfazer(admin, m.from, usuario, dono, perfil)
  if (/^(ajuda|menu|oi|ol[áa]|bom dia|boa tarde|boa noite)\W*$/i.test(texto)) {
    await enviarTexto(m.from, AJUDA)
    return
  }
  if (m.type === 'audio') {
    await enviarTexto(
      m.from,
      'Ainda não entendo áudio por aqui. Mande o gasto por texto ou a foto da nota.',
    )
    return
  }
  if (!iaAtiva()) {
    await enviarTexto(m.from, 'A leitura automática está desligada no momento. Registre pelo app.')
    return
  }

  let anexo: Anexo | undefined
  const midia = m.image ?? (m.document?.mime_type === 'application/pdf' ? m.document : undefined)
  if (midia) {
    const arquivo = await baixarMidia(midia.id).catch(() => null)
    const tipos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
    const tipo = tipos.find((t) => t === arquivo?.tipo)
    if (!arquivo || !tipo) {
      await enviarTexto(
        m.from,
        'Não consegui abrir este arquivo. Mande uma foto (JPG ou PNG) ou um PDF de até 4 MB.',
      )
      return
    }
    anexo = { tipo, base64: arquivo.base64 }
  } else if (m.document) {
    await enviarTexto(m.from, 'Por enquanto leio só fotos e PDFs.')
    return
  } else if (!texto) {
    await enviarTexto(m.from, AJUDA)
    return
  }

  const hoje = hojeEmSaoPaulo()
  const ctx = await contexto(admin, dono, hoje)
  let leitura
  try {
    leitura = await lerLancamentos(ctx, texto, anexo)
  } catch (e) {
    await enviarTexto(m.from, e instanceof ErroDeIA ? e.message : 'Algo deu errado. Tente de novo.')
    return
  }
  if (!leitura.itens.length) {
    await enviarTexto(
      m.from,
      leitura.observacao ?? 'Não encontrei nenhum lançamento nessa mensagem.\n\n' + AJUDA,
    )
    return
  }

  // Conta padrão quando a IA não soube: a primeira conta ativa.
  const contaPadrao = ctx.contas[0]?.id ?? null
  const lancamentos = leitura.itens.flatMap((r) =>
    parcelar(
      lancamentoVazio({
        tipo: r.tipo,
        data: r.data,
        valor: r.valor,
        descricao: r.descricao,
        categoria_id: r.categoria_id,
        cartao_id: r.cartao_id,
        conta_id: r.cartao_id ? null : (r.conta_id ?? contaPadrao),
        forma_pagamento: r.forma_pagamento,
        observacao: 'Pelo WhatsApp',
      }),
      r.parcelas ?? 1,
    ),
  )
  const validos = lancamentos.filter((l) => ESQUEMAS.lancamentos.safeParse(l).success)
  if (!validos.length) {
    await enviarTexto(
      m.from,
      'Entendi o valor, mas falta a conta. Cadastre uma conta no app e tente de novo.',
    )
    return
  }
  const linhas = validos.map(({ created_at: _c, ...l }) => ({
    ...l,
    valor: l.valor / 100,
    user_id: dono,
    criado_por: usuario,
  }))
  const { error } = await admin.from('lancamentos').insert(linhas)
  if (error) {
    console.error('[whatsapp] inserir', error.message)
    await enviarTexto(m.from, 'Não consegui salvar agora. Tente de novo em instantes.')
    return
  }
  await admin
    .from('perfis')
    .update({
      whatsapp_ultimos: linhas.map((l) => l.id),
      whatsapp_ultimos_em: new Date().toISOString(),
    })
    .eq('user_id', usuario)

  const nome = (id: string | null, lista: { id: string; nome: string }[]) =>
    lista.find((x) => x.id === id)?.nome
  const linhasTexto = leitura.itens.map((r) => {
    const onde = nome(r.cartao_id, ctx.cartoes) ?? nome(r.conta_id ?? contaPadrao, ctx.contas) ?? ''
    const cat = nome(r.categoria_id, ctx.categorias) ?? 'Sem categoria'
    const sinal = r.tipo === 'receita' ? '+' : '-'
    const parcelas = r.parcelas ? ` em ${r.parcelas}x` : ''
    return `• ${r.descricao || 'Lançamento'} · ${sinal}${formatarReais(r.valor)}${parcelas}\n   ${cat} · ${onde} · ${dataBR(r.data)}`
  })
  const orcamento = await avisoDeOrcamento(admin, dono, ctx, leitura.itens)
  await enviarTexto(
    m.from,
    `✅ Registrado:\n${linhasTexto.join('\n')}${orcamento ? `\n\n${orcamento}` : ''}\n\nResponda *desfazer* para apagar.`,
  )
}

/** "Você usou 64% do orçamento de Alimentação" para a categoria do primeiro gasto. */
async function avisoDeOrcamento(
  admin: SupabaseClient,
  dono: string,
  ctx: Contexto,
  itens: { tipo: string; categoria_id: string | null; data: string }[],
): Promise<string | null> {
  const gasto = itens.find((i) => i.tipo === 'despesa' && i.categoria_id)
  if (!gasto?.categoria_id) return null
  const cat = ctx.categorias.find((c) => c.id === gasto.categoria_id)
  const raiz = cat?.pai ? ctx.categorias.find((c) => c.id === cat.pai) : cat
  if (!raiz) return null
  const { data: orc } = await admin
    .from('orcamentos')
    .select('valor')
    .eq('user_id', dono)
    .eq('categoria_id', raiz.id)
    .maybeSingle()
  if (!orc) return null
  const familia = [raiz.id, ...ctx.categorias.filter((c) => c.pai === raiz.id).map((c) => c.id)]
  const mes = mesDe(gasto.data)
  const { data: doMes } = await admin
    .from('lancamentos')
    .select('valor')
    .eq('user_id', dono)
    .eq('tipo', 'despesa')
    .in('categoria_id', familia)
    .gte('data', inicioDoMes(mes))
    .lte('data', fimDoMes(mes))
  const usado = (doMes ?? []).reduce((s, l) => s + Number(l.valor), 0)
  const pct = Math.round((usado / Number(orc.valor)) * 100)
  const alerta = pct >= 100 ? '🚨 ' : pct >= 90 ? '⚠️ ' : ''
  return `${alerta}Você usou ${pct}% do orçamento de ${raiz.nome} em ${rotuloMes(mes)}.`
}

async function contexto(admin: SupabaseClient, dono: string, hoje: string): Promise<Contexto> {
  const [cat, contas, cartoes] = await Promise.all([
    admin.from('categorias').select('id, nome, tipo, pai_id').eq('user_id', dono),
    admin
      .from('contas')
      .select('id, nome')
      .eq('user_id', dono)
      .eq('arquivada', false)
      .order('created_at'),
    admin
      .from('cartoes')
      .select('id, nome')
      .eq('user_id', dono)
      .eq('arquivado', false)
      .order('created_at'),
  ])
  return {
    hoje,
    categorias: (cat.data ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      pai: c.pai_id,
    })),
    contas: contas.data ?? [],
    cartoes: cartoes.data ?? [],
  }
}

async function vincular(admin: SupabaseClient, telefone: string, codigo: string) {
  const { data: perfil } = await admin
    .from('perfis')
    .select('user_id')
    .eq('whatsapp_codigo', codigo)
    .gt('whatsapp_codigo_expira', new Date().toISOString())
    .maybeSingle()
  if (!perfil) {
    await enviarTexto(
      telefone,
      'Código inválido ou vencido. Gere um novo no app, em Configurações › WhatsApp.',
    )
    return
  }
  // Um número fica ligado a uma conta só.
  await admin.from('perfis').update({ telefone: null }).eq('telefone', telefone)
  await admin
    .from('perfis')
    .update({ telefone, whatsapp_codigo: null, whatsapp_codigo_expira: null })
    .eq('user_id', perfil.user_id)
  await enviarTexto(telefone, `Número vinculado ao GBFinanças! 🎉\n\n${AJUDA}`)
}

async function desfazer(
  admin: SupabaseClient,
  telefone: string,
  usuario: string,
  dono: string,
  perfil: { whatsapp_ultimos: string[] | null; whatsapp_ultimos_em: string | null },
) {
  const ids = perfil.whatsapp_ultimos ?? []
  const recente =
    perfil.whatsapp_ultimos_em &&
    Date.now() - Date.parse(perfil.whatsapp_ultimos_em) < 60 * 60 * 1000
  if (!ids.length || !recente) {
    await enviarTexto(telefone, 'Não há registro recente para desfazer. Edite pelo app.')
    return
  }
  await admin
    .from('lancamentos')
    .delete()
    .in('id', ids)
    .eq('user_id', dono)
    .eq('criado_por', usuario)
  await admin
    .from('perfis')
    .update({ whatsapp_ultimos: [], whatsapp_ultimos_em: null })
    .eq('user_id', usuario)
  await enviarTexto(telefone, '↩️ Pronto, apaguei o último registro.')
}
