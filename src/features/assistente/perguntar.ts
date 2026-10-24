import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { ErroDeIA, iaAtiva } from '@/features/ia/ler'

const modelo = () => process.env.GBF_IA_MODELO?.trim() || 'claude-opus-5-5'

const PERSONA = `Você é o Grão, o assistente do GBFinanças, um app brasileiro de finanças pessoais. Responde perguntas da pessoa sobre o próprio dinheiro usando só os dados abaixo.

Como responder:
- Português do Brasil, tom amigável e direto, como um amigo que entende de finanças. Frases curtas.
- Comece pela resposta (o número ou o sim/não) e explique em poucas linhas de onde ela vem.
- Valores no formato R$ 1.234,56. Não invente números: se o dado não estiver aqui, diga o que falta e como registrar no app.
- "Posso comprar X?": compare com o saldo projetado do fim do mês, as contas a pagar e as faturas, e diga se cabe com folga, cabe apertado ou não cabe.
- Pode sugerir hábitos e cortes concretos com base nos gastos. Não recomende investimentos, produtos financeiros ou ativos específicos: você não é consultor de investimentos; nesse caso, explique o conceito em termos gerais.
- Sem tabelas. Use listas curtas com "•" quando ajudar. Máximo de uns 120 palavras, salvo se pedirem detalhe.`

export type Mensagem = { papel: 'pessoa' | 'grao'; texto: string }

export async function perguntarAoGrao(resumo: string, historico: Mensagem[]): Promise<string> {
  if (!iaAtiva()) throw new ErroDeIA('O assistente não está configurado.')
  const cliente = new Anthropic()
  let resposta: Anthropic.Beta.BetaMessage
  try {
    resposta = await cliente.beta.messages.create({
      model: modelo(),
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      // O retrato das finanças fica em cache: as perguntas seguintes da conversa saem mais baratas.
      system: [
        { type: 'text', text: PERSONA },
        {
          type: 'text',
          text: `# Dados da pessoa\n\n${resumo}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: historico.map((m) => ({
        role: m.papel === 'pessoa' ? ('user' as const) : ('assistant' as const),
        content: m.texto,
      })),
    })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      throw new ErroDeIA('Muitas perguntas agora. Tente de novo em instantes.')
    console.error('[assistente]', e instanceof Error ? e.message : e)
    throw new ErroDeIA('Não consegui responder agora. Tente de novo.')
  }
  if (resposta.stop_reason === 'refusal')
    throw new ErroDeIA('Não posso ajudar com essa pergunta. Tente perguntar de outro jeito.')
  const texto = resposta.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  if (!texto) throw new ErroDeIA('Não consegui responder agora. Tente de novo.')
  return texto
}
