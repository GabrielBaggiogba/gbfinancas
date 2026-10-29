import { somarDias, somarMesRef, mesDe } from '@/lib/datas'
import type { FormaPagamento } from '@/features/financas/tipos'

// Entende frases faladas do dia a dia sem IA: "gastei 45 no mercado ontem no pix",
// "uber 23,90", "recebi 1500 de salário", "comprei um tênis de 300 em 3 vezes no Nubank".

export type Opcoes = {
  hoje: string
  categorias: { id: string; nome: string; tipo: 'receita' | 'despesa' }[]
  contas: { id: string; nome: string }[]
  cartoes: { id: string; nome: string }[]
}

export type Falado = {
  tipo: 'receita' | 'despesa'
  valor: number
  descricao: string
  data: string
  categoria_id: string | null
  conta_id: string | null
  cartao_id: string | null
  forma_pagamento: FormaPagamento | null
  parcelas: number
}

export const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Palavra-chave → nome da categoria padrão (ou parecido) da pessoa.
const PISTAS: [RegExp, string[]][] = [
  [
    /\b(mercado|supermercado|padaria|almoco|janta|jantar|lanche|cafe|restaurante|ifood|pizza|acougue|feira|hortifruti|comida|hamburguer|sorvete|bar)\b/,
    ['alimentacao', 'mercado', 'comida'],
  ],
  [
    /\b(uber|99|taxi|onibus|metro|gasolina|combustivel|posto|estacionamento|pedagio|passagem|oficina|carro|moto)\b/,
    ['transporte', 'carro'],
  ],
  [
    /\b(farmacia|remedio|medico|consulta|dentista|exame|hospital|academia|plano de saude)\b/,
    ['saude'],
  ],
  [
    /\b(aluguel|condominio|luz|energia|agua|gas|internet|iptu|faxina|diarista)\b/,
    ['moradia', 'casa'],
  ],
  [
    /\b(netflix|spotify|disney|prime|amazon prime|youtube|assinatura|hbo|globoplay|icloud|chatgpt)\b/,
    ['assinaturas', 'assinatura'],
  ],
  [/\b(cinema|show|viagem|passeio|jogo|balada|festa|ingresso|hotel)\b/, ['lazer']],
  [/\b(curso|faculdade|escola|livro|material escolar|mensalidade)\b/, ['estudos', 'educacao']],
  [/\b(roupa|tenis|sapato|camisa|calca|loja|shopping|presente|eletronico|celular)\b/, ['compras']],
  [/\b(salario|pagamento do trabalho)\b/, ['salario']],
  [/\b(freela|freelance|bico|servico)\b/, ['freelance']],
  [/\b(dividendo|rendimento|juros)\b/, ['investimentos']],
]

const FORMAS: [RegExp, FormaPagamento][] = [
  [/\bpix\b/, 'pix'],
  [/\b(debito)\b/, 'debito'],
  [/\b(credito|cartao)\b/, 'credito'],
  [/\b(dinheiro|especie)\b/, 'dinheiro'],
  [/\bboleto\b/, 'boleto'],
  [/\b(transferencia|ted|doc)\b/, 'transferencia'],
]

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

const NUMEROS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  quinze: 15,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
}

// Palavras que não entram na descrição.
const RUIDO = new Set(
  `gastei gasto paguei pago comprei compra foi foram de do da dos das no na nos nas em com um uma o a os as e
  reais real conto contos pila centavos hoje ontem anteontem pix debito credito cartao dinheiro especie boleto
  transferencia eu me meu minha valor rs r vezes parcelas parcela x dia passado passada semana para pra pro
  recebi ganhei entrou caiu agora pouco la ai quanto tive tava usei deu ficou`
    .split(/\s+/)
    .concat(DIAS_DA_SEMANA, Object.keys(NUMEROS), ['mil', 'feira']),
)

function numeroEscrito(palavras: string[]): number | null {
  let total = 0
  let achou = false
  for (const p of palavras) {
    if (p === 'e') continue
    if (p === 'mil') {
      total = (total || 1) * 1000
      achou = true
    } else if (p in NUMEROS) {
      total += NUMEROS[p]
      achou = true
    } else if (achou) break
  }
  return achou ? total : null
}

/** "45", "45,90", "1.500", "2 mil", "R$ 45", "45 reais e 90 centavos", "cinquenta reais". */
function acharValor(t: string): { valor: number; trecho: string } | null {
  const mil = /(\d+(?:,\d+)?)\s*mil(?:\s+e\s+(\d+))?/.exec(t)
  if (mil) {
    const v = parseFloat(mil[1].replace(',', '.')) * 1000 + (mil[2] ? Number(mil[2]) : 0)
    return { valor: v, trecho: mil[0] }
  }
  const num =
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d{1,2}))?(?:\s*(?:reais|real|conto|contos|pila))?(?:\s+e\s+(\d{1,2})\s+centavos)?/.exec(
      t,
    )
  if (num) {
    const inteiro = Number(num[1].replace(/\./g, ''))
    const cent = num[2] ? Number(num[2].padEnd(2, '0')) : num[3] ? Number(num[3]) : 0
    return { valor: inteiro + cent / 100, trecho: num[0] }
  }
  const palavras = t.split(/\s+/)
  for (let i = 0; i < palavras.length; i++) {
    const v = numeroEscrito(palavras.slice(i))
    if (v) return { valor: v, trecho: palavras[i] }
  }
  return null
}

function acharData(t: string, hoje: string): string {
  if (/\banteontem\b/.test(t)) return somarDias(hoje, -2)
  if (/\bontem\b/.test(t)) return somarDias(hoje, -1)
  const dia = /\bdia\s+(\d{1,2})\b/.exec(t)
  if (dia) {
    const d = Number(dia[1])
    let ref = mesDe(hoje)
    if (d > Number(hoje.slice(8, 10))) ref = somarMesRef(ref, -1)
    const ultimo = new Date(
      Date.UTC(Number(ref.slice(0, 4)), Number(ref.slice(5, 7)), 0),
    ).getUTCDate()
    if (d >= 1 && d <= ultimo) return `${ref}-${String(d).padStart(2, '0')}`
  }
  const semana = DIAS_DA_SEMANA.findIndex((n) => new RegExp(`\\b${n}\\b`).test(t))
  if (semana >= 0) {
    const atual = new Date(`${hoje}T12:00:00Z`).getUTCDay()
    const atras = (atual - semana + 7) % 7 || 7
    return somarDias(hoje, -atras)
  }
  return hoje
}

function acharPeloNome<T extends { id: string; nome: string }>(t: string, lista: T[]): T | null {
  // Nomes mais longos primeiro: "Nubank Ultravioleta" antes de "Nubank".
  const ordenada = [...lista].sort((a, b) => b.nome.length - a.nome.length)
  return ordenada.find((x) => sem(x.nome).trim() && t.includes(sem(x.nome).trim())) ?? null
}

/** Interpreta a fala; devolve null quando não há valor. */
export function interpretarFala(fala: string, o: Opcoes): Falado | null {
  const t = sem(fala)
    .replace(/[!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return null

  const tipo: Falado['tipo'] = /\b(recebi|ganhei|entrou|caiu|salario|recebimento|vendi)\b/.test(t)
    ? 'receita'
    : 'despesa'

  // Parcelas saem antes do valor: "em 3 vezes", "3x", "em 10 parcelas".
  let resto = t
  let parcelas = 1
  const p = /\b(?:em\s+)?(\d{1,2})\s*(?:x|vezes|parcelas)\b/.exec(resto)
  if (p) {
    parcelas = Math.min(48, Math.max(1, Number(p[1])))
    resto = resto.replace(p[0], ' ')
  }
  const achado = acharValor(resto)
  if (!achado || !(achado.valor > 0)) return null
  resto = resto.replace(achado.trecho, ' ')

  const cartao = tipo === 'despesa' ? acharPeloNome(t, o.cartoes) : null
  const conta = cartao ? null : acharPeloNome(t, o.contas)
  const forma = cartao ? 'credito' : (FORMAS.find(([r]) => r.test(t))?.[1] ?? null)

  const categorias = o.categorias.filter((c) => c.tipo === tipo)
  let categoria = acharPeloNome(t, categorias)
  if (!categoria)
    for (const [r, nomes] of PISTAS) {
      if (!r.test(t)) continue
      categoria = categorias.find((c) => nomes.some((n) => sem(c.nome).includes(n))) ?? null
      if (categoria) break
    }

  // Descrição: o que sobrou tirando valor, data, forma, conta e cartão.
  const tirar = new Set(
    [cartao?.nome, conta?.nome].filter(Boolean).flatMap((n) => sem(n as string).split(/\s+/)),
  )
  const palavras = resto
    .replace(/\bdia\s+\d{1,2}\b/, ' ')
    .split(/\s+/)
    .filter((w) => w && !RUIDO.has(w) && !tirar.has(w) && !/^[\d.,$]+$/.test(w))
    .slice(0, 5)
  const original = fala.split(/\s+/)
  // Recupera os acentos da fala original para cada palavra escolhida.
  const comAcento = palavras.map(
    (w) => original.find((x) => sem(x).replace(/[^\w]/g, '') === w) ?? w,
  )
  let descricao = comAcento.join(' ').trim()
  if (!descricao) descricao = categoria?.nome ?? (tipo === 'receita' ? 'Entrada' : 'Gasto')
  descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1)

  return {
    tipo,
    valor: Math.round(achado.valor * 100) / 100,
    descricao,
    data: acharData(t, o.hoje),
    categoria_id: categoria?.id ?? null,
    conta_id: conta?.id ?? null,
    cartao_id: cartao?.id ?? null,
    forma_pagamento: forma,
    parcelas,
  }
}
