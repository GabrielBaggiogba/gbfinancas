import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { perguntarAoGrao } from '@/features/assistente/perguntar'
import { resumoParaAssistente } from '@/features/assistente/resumo'
import {
  gastosPorCategoria,
  resumoDoMes,
  resumoDoPeriodo,
  saldoDisponivel,
} from '@/features/financas/calculos'
import {
  CAMPOS_DINHEIRO,
  DADOS_VAZIOS,
  TABELAS,
  type Dados,
  type Tabela,
} from '@/features/financas/tipos'
import { iaAtiva } from '@/features/ia/ler'
import { sem } from '@/features/voz/interpretar'
import { inicioDoMes, mesDe, rotuloMes, somarDias } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'

// Perguntas sobre o próprio dinheiro pelo WhatsApp: "quanto gastei este mês?", "qual meu saldo?".
// Com a IA ligada, o Grão responde qualquer pergunta; sem ela, um resumo com os números do mês.

/** Pergunta (e não lançamento): termina com "?" ou começa como pergunta, sem valor em reais. */
export function ehPergunta(texto: string): boolean {
  const t = sem(texto).trim()
  if (/\?\s*$/.test(t)) return true
  return /^(quanto|qual|quais|como|posso|devo|da pra|resumo|saldo|extrato|me (diz|fala|mostra|conta)|o que|onde|ja gastei|meus? (gastos|saldo))\b/.test(
    t,
  )
}

/** Tudo do dono, lido pelo servidor (o WhatsApp não tem a sessão da pessoa). */
async function carregarDoDono(admin: SupabaseClient, dono: string): Promise<Dados> {
  const listas = await Promise.all(
    TABELAS.map(async (t) => {
      const { data } = await admin.from(t).select('*').eq('user_id', dono).limit(5000)
      return (data ?? []).map((linha) => paraApp(t, linha as Record<string, unknown>))
    }),
  )
  const dados = { ...DADOS_VAZIOS } as Record<Tabela, unknown[]>
  TABELAS.forEach((t, i) => (dados[t] = listas[i]))
  return dados as Dados
}

// O banco guarda reais; o app calcula em centavos.
function paraApp(tabela: Tabela, linha: Record<string, unknown>) {
  const saida = { ...linha }
  for (const campo of CAMPOS_DINHEIRO[tabela])
    if (saida[campo] != null) saida[campo] = Math.round(Number(saida[campo]) * 100)
  return saida
}

export async function responderPergunta(
  admin: SupabaseClient,
  dono: string,
  pergunta: string,
  hoje: string,
): Promise<string> {
  const dados = await carregarDoDono(admin, dono)
  if (iaAtiva()) {
    try {
      return await perguntarAoGrao(resumoParaAssistente(dados, hoje), [
        { papel: 'pessoa', texto: pergunta },
      ])
    } catch {
      // Sem IA no momento: segue com o resumo dos números.
    }
  }
  return resumoDoDia(dados, hoje)
}

/** Resposta sem IA: o mês até hoje, o dia, o saldo e onde mais se gastou. */
export function resumoDoDia(dados: Dados, hoje: string): string {
  const ref = mesDe(hoje)
  const mes = resumoDoMes(dados, ref)
  const dia = resumoDoPeriodo(dados, hoje, hoje)
  const ontem = resumoDoPeriodo(dados, somarDias(hoje, -1), somarDias(hoje, -1))
  const maiores = gastosPorCategoria(dados, inicioDoMes(ref), hoje).slice(0, 3)
  const linhas = [
    `📊 *${rotuloMes(ref)}*`,
    `• Gastos: ${formatarReais(mes.saidas)}`,
    `• Entradas: ${formatarReais(mes.entradas)}`,
    `• Sobra do mês: ${formatarReais(mes.saldo)}`,
    `• Saldo nas contas hoje: ${formatarReais(saldoDisponivel(dados, hoje))}`,
    '',
    `Hoje você gastou ${formatarReais(dia.saidas)}; ontem, ${formatarReais(ontem.saidas)}.`,
  ]
  if (maiores.length)
    linhas.push(
      '',
      'Onde mais foi dinheiro:',
      ...maiores.map((c) => `• ${c.nome}: ${formatarReais(c.total)}`),
    )
  return linhas.join('\n')
}
