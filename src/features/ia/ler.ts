import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { dataValida } from '@/lib/datas'
import { MAX_CENTAVOS } from '@/lib/dinheiro'
import type { FormaPagamento } from '@/features/financas/tipos'

// Leitura de lançamentos com o Claude: texto livre ("almoço 32 no pix"), transcrição de voz,
// foto de nota fiscal ou PDF. Usado pelo app e pelo WhatsApp. Só funciona com ANTHROPIC_API_KEY.

export function iaAtiva(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

const modelo = () => process.env.GBF_IA_MODELO?.trim() || 'claude-opus-5-5'

export type Contexto = {
  hoje: string
  categorias: { id: string; nome: string; tipo: 'receita' | 'despesa'; pai: string | null }[]
  contas: { id: string; nome: string }[]
  cartoes: { id: string; nome: string }[]
}

export type Anexo = {
  tipo: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
  base64: string
}

export type Rascunho = {
  tipo: 'receita' | 'despesa'
  valor: number // centavos
  data: string
  descricao: string
  categoria_id: string | null
  conta_id: string | null
  cartao_id: string | null
  forma_pagamento: FormaPagamento | null
  parcelas: number | null
}

export type Leitura = { itens: Rascunho[]; observacao: string | null }

export class ErroDeIA extends Error {}

const FORMAS = ['dinheiro', 'pix', 'debito', 'credito', 'boleto', 'transferencia'] as const

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['itens', 'observacao'],
  properties: {
    itens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'tipo',
          'valor',
          'data',
          'descricao',
          'categoria_id',
          'conta_id',
          'cartao_id',
          'forma_pagamento',
          'parcelas',
        ],
        properties: {
          tipo: { type: 'string', enum: ['despesa', 'receita'] },
          valor: { type: 'number', description: 'Valor em reais, positivo, com até 2 casas.' },
          data: { type: 'string', description: 'AAAA-MM-DD' },
          descricao: { type: 'string', description: 'Curta, até 60 caracteres.' },
          categoria_id: { type: ['string', 'null'] },
          conta_id: { type: ['string', 'null'] },
          cartao_id: { type: ['string', 'null'] },
          forma_pagamento: { type: ['string', 'null'], enum: [...FORMAS, null] },
          parcelas: { type: ['integer', 'null'] },
        },
      },
    },
    observacao: {
      type: ['string', 'null'],
      description: 'Só quando não deu para entender algo; uma frase para a pessoa.',
    },
  },
} as const

const respostaSchema = z.object({
  itens: z
    .array(
      z.object({
        tipo: z.enum(['despesa', 'receita']),
        valor: z.number(),
        data: z.string(),
        descricao: z.string(),
        categoria_id: z.string().nullable(),
        conta_id: z.string().nullable(),
        cartao_id: z.string().nullable(),
        forma_pagamento: z.enum(FORMAS).nullable(),
        parcelas: z.number().int().nullable(),
      }),
    )
    .max(30),
  observacao: z.string().nullable(),
})

function instrucoes(ctx: Contexto): string {
  const nomeCat = (c: Contexto['categorias'][number]) => {
    const pai = c.pai ? ctx.categorias.find((x) => x.id === c.pai) : null
    return pai ? `${pai.nome} › ${c.nome}` : c.nome
  }
  const lista = (itens: { id: string; nome: string }[]) =>
    itens.length ? itens.map((i) => `- ${i.id}: ${i.nome}`).join('\n') : '(nenhum)'
  return `Você registra lançamentos financeiros pessoais de um app brasileiro. A pessoa manda texto, a transcrição de uma fala, a foto de uma nota fiscal ou um PDF (boleto, fatura, comprovante). Devolva os lançamentos que ela quer registrar.

Hoje é ${ctx.hoje} (horário de Brasília). Datas relativas ("ontem", "sexta") são calculadas a partir de hoje; sem data, use hoje.

Regras:
- Valores em reais. "32", "R$ 32", "trinta e dois reais" são 32. Em nota fiscal, use o total pago, não subtotais nem itens.
- Uma nota, um comprovante ou um boleto é um lançamento só. Separe em vários só quando a pessoa citar gastos diferentes ("almoço 30 e uber 18").
- "tipo": receita para dinheiro que entrou (salário, pix recebido, venda); despesa para o resto.
- "descricao": curta e natural, como a pessoa escreveria (ex.: "Almoço", "Farmácia São João", "Conta de luz").
- "categoria_id": escolha o id que melhor combina, do mesmo tipo do lançamento; prefira a subcategoria quando ela couber. Sem boa opção, null.
- Conta ou cartão: use cartao_id quando for compra no cartão de crédito; caso contrário conta_id. Escolha pelo nome citado; se houver só uma opção que sirva, use-a; se não der para saber, null.
- "forma_pagamento": pix, debito, credito, dinheiro, boleto ou transferencia quando der para saber; senão null.
- "parcelas": número de parcelas de uma compra parcelada ("em 3x"); senão null.
- Se a mensagem não tiver nenhum lançamento, devolva itens vazio e explique em "observacao". Não invente valores.

Categorias:
${ctx.categorias.map((c) => `- ${c.id}: ${nomeCat(c)} (${c.tipo})`).join('\n') || '(nenhuma)'}

Contas:
${lista(ctx.contas)}

Cartões de crédito:
${lista(ctx.cartoes)}`
}

/** Lê texto e/ou um anexo e devolve rascunhos de lançamento já validados contra o contexto. */
export async function lerLancamentos(
  ctx: Contexto,
  texto: string,
  anexo?: Anexo,
): Promise<Leitura> {
  if (!iaAtiva()) throw new ErroDeIA('A leitura com IA não está configurada.')
  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = []
  if (anexo?.tipo === 'application/pdf')
    conteudo.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: anexo.base64 },
    })
  else if (anexo)
    conteudo.push({
      type: 'image',
      source: { type: 'base64', media_type: anexo.tipo, data: anexo.base64 },
    })
  conteudo.push({ type: 'text', text: texto.trim() || 'Registre o lançamento deste anexo.' })

  const cliente = new Anthropic()
  let resposta: Anthropic.Beta.BetaMessage
  try {
    resposta = await cliente.beta.messages.create({
      model: modelo(),
      max_tokens: 4000,
      // Se o modelo recusar por engano, a API tenta de novo no modelo recomendado.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: instrucoes(ctx),
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
      messages: [{ role: 'user', content: conteudo }],
    })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      throw new ErroDeIA('Muitos pedidos agora. Tente de novo em instantes.')
    if (e instanceof Anthropic.BadRequestError)
      throw new ErroDeIA('Não consegui ler este arquivo. Tente uma foto mais nítida ou outro PDF.')
    console.error('[ia]', e instanceof Error ? e.message : e)
    throw new ErroDeIA('A leitura com IA falhou. Tente de novo.')
  }
  if (resposta.stop_reason === 'refusal')
    throw new ErroDeIA('Não consegui processar este pedido. Registre manualmente.')
  const bloco = resposta.content.find((b) => b.type === 'text')
  let json: unknown = null
  try {
    json = bloco ? JSON.parse(bloco.text) : null
  } catch {
    // cai na validação abaixo
  }
  const lido = respostaSchema.safeParse(json)
  if (!lido.success) throw new ErroDeIA('A resposta da IA veio incompleta. Tente de novo.')

  const itens = lido.data.itens.map((i) => limpar(i, ctx)).filter((i) => i !== null)
  return { itens, observacao: lido.data.observacao }
}

/** Confere cada campo: ids que não existem viram null, valor e data fora do formato caem. */
function limpar(
  i: z.infer<typeof respostaSchema>['itens'][number],
  ctx: Contexto,
): Rascunho | null {
  const valor = Math.round(i.valor * 100)
  if (!(valor > 0 && valor <= MAX_CENTAVOS)) return null
  const categoria = ctx.categorias.find((c) => c.id === i.categoria_id && c.tipo === i.tipo)
  const conta = ctx.contas.some((c) => c.id === i.conta_id) ? i.conta_id : null
  const cartao =
    i.tipo === 'despesa' && ctx.cartoes.some((c) => c.id === i.cartao_id) ? i.cartao_id : null
  return {
    tipo: i.tipo,
    valor,
    data: dataValida(i.data) ? i.data : ctx.hoje,
    descricao: i.descricao.trim().slice(0, 120),
    categoria_id: categoria?.id ?? null,
    conta_id: cartao ? null : conta,
    cartao_id: cartao,
    forma_pagamento: cartao ? 'credito' : i.forma_pagamento,
    parcelas: cartao && i.parcelas && i.parcelas > 1 && i.parcelas <= 60 ? i.parcelas : null,
  }
}
